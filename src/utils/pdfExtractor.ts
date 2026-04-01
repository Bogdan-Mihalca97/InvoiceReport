import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { callClaudeOcrBatch, callClaudeExtractBatch, BATCH_SIZE, ExtractedBatchResult, ExtractedLocation } from './claudeOcr';
import { InvoiceRecord } from '@/types/invoice';

// Configure PDF.js worker - use jsdelivr CDN which is more reliable
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const OCR_SCALE = 2.0; // reduced from 3.0 — ~44% fewer pixels, fewer input tokens
const MIN_TEXT_CHARS = 50; // pages with fewer chars than this are treated as image-only

/**
 * Extracts text content from a PDF file.
 *
 * Strategy per page:
 *   1. Try PDF.js text extraction.
 *   2. If a page has < MIN_TEXT_CHARS of real text, mark it for OCR.
 *   3. OCR image-only pages using Claude Vision (if apiKey provided) or Tesseract.
 *      Claude path batches BATCH_SIZE pages per API call to reduce round-trips.
 */
export async function extractTextFromPDF(file: File, apiKey?: string): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pageTexts: string[] = new Array(pdf.numPages).fill('');
    const ocrPageNums: number[] = []; // 1-based page numbers that need OCR

    // Pass 1: per-page text extraction
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ').trim();

      if (pageText.length >= MIN_TEXT_CHARS) {
        pageTexts[pageNum - 1] = pageText;
        console.log(`Page ${pageNum}: text extracted (${pageText.length} chars)`);
      } else {
        ocrPageNums.push(pageNum);
        console.log(`Page ${pageNum}: insufficient text (${pageText.length} chars), queued for OCR`);
      }
    }

    if (ocrPageNums.length === 0) {
      console.log(`All ${pdf.numPages} pages extracted via PDF.js text`);
      return pageTexts.map(t => t + '\n\n--- PAGE BREAK ---\n\n').join('');
    }

    console.log(`${ocrPageNums.length} page(s) need OCR, using ${apiKey ? 'Claude Vision' : 'Tesseract'}`);

    // Pass 2: render image-only pages
    const rendered: Array<{ pageIndex: number; base64: string }> = [];
    for (const pageNum of ocrPageNums) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Failed to get canvas context');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      const base64 = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
      rendered.push({ pageIndex: pageNum - 1, base64 });
    }

    // Pass 3: OCR
    if (apiKey) {
      // Claude Vision — all batches fire in parallel; semaphore in claudeOcr.ts caps concurrency
      const batches: Array<{ pageIndex: number; base64: string }[]> = [];
      for (let i = 0; i < rendered.length; i += BATCH_SIZE) {
        batches.push(rendered.slice(i, i + BATCH_SIZE));
      }
      await Promise.all(
        batches.map(async (batch) => {
          console.log(`Claude OCR: pages ${batch.map(b => b.pageIndex + 1).join(', ')}`);
          const results = await callClaudeOcrBatch(batch.map(b => b.base64), apiKey);
          for (let j = 0; j < batch.length; j++) {
            pageTexts[batch[j].pageIndex] = results[j];
          }
        })
      );
    } else {
      // Tesseract fallback — sequential, single worker
      const worker = await createWorker('ron');
      try {
        for (const { pageIndex, base64 } of rendered) {
          console.log(`Tesseract OCR: page ${pageIndex + 1}`);
          const { data } = await worker.recognize(`data:image/png;base64,${base64}`);
          pageTexts[pageIndex] = data.text;
        }
      } finally {
        await worker.terminate();
      }
    }

    console.log('OCR completed. Total text length:', pageTexts.join('').length);
    return pageTexts.map(t => t + '\n\n--- PAGE BREAK ---\n\n').join('');
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(
      `Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================
// STRUCTURED JSON EXTRACTION (Claude API path)
// ============================================================

/**
 * Extracts invoice data directly as InvoiceRecord[] using a single Claude API call
 * with all pages sent at once. Claude sees the full document, eliminating cross-page confusion.
 */
export async function extractInvoiceDataFromPDF(
  file: File,
  apiKey: string,
  fileName: string,
): Promise<InvoiceRecord[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allImages: string[] = [];
  const allTexts: string[] = [];

  // Pass 1: PDF.js text extraction; render image-only pages to canvas
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ').trim();

    if (pageText.length >= MIN_TEXT_CHARS) {
      allTexts.push(`[Page ${pageNum}]\n${pageText}`);
    } else {
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Failed to get canvas context');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      allImages.push(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
    }
  }

  console.log(`Claude JSON extract: ${allImages.length} image pages + ${allTexts.length} text pages in one call`);
  const result = await callClaudeExtractBatch(allImages, apiKey, allTexts);
  console.log('Claude JSON extraction result:', result);

  return buildInvoiceRecords(result, fileName);
}

/** Converts an ExtractedBatchResult into InvoiceRecord[]. */
function buildInvoiceRecords(data: ExtractedBatchResult, fileName: string): InvoiceRecord[] {
  const il = data.invoiceLevel;
  // Drop any location without a valid 10–12 digit NLC code (summary/total rows)
  data.locations = (data.locations ?? []).filter(loc => /^\d{10,12}$/.test(loc.nlcCode ?? ''));
  const today = new Date().toISOString().split('T')[0];

  // Validate invoiceNumber: must start with EFI (optionally followed by /)
  const rawInvoiceNum = il.invoiceNumber ?? '';
  const invoiceNumber = /^EFI\/?[\d]/i.test(rawInvoiceNum) ? rawInvoiceNum : '';

  const common = {
    fileName,
    supplier: il.supplier ?? 'NECUNOSCUT',
    invoiceNumber,
    issueDate: il.issueDate ?? '',
    clientName: il.clientName ?? '',
    startDate: il.startDate ?? '',
    endDate: il.endDate ?? '',
    totalPayment: il.totalPayment ?? 0,
    soldTotal: 0,
    processingDate: today,
    documentLink: '',
  };

  const toStatus = (loc: ExtractedLocation): InvoiceRecord['status'] => {
    if (!loc.nlcCode && !loc.locationName) return 'INCOMPLETE';
    if (loc.consumptionKwh === null) return 'INCOMPLETE';
    return 'OK';
  };

  if (data.locations.length === 0) {
    // No per-location data — single record from invoice-level fields
    return [{
      id: Math.random().toString(36).substring(7),
      ...common,
      locationName: '',
      nlcCode: '',
      podCode: '',
      address: '',
      consumptionKwh: 0,
      consumptionUnit: 'kWh',
      sourceLine: '',
      status: 'INCOMPLETE',
      observations: 'Nu s-au găsit locații de consum',
    }];
  }

  return data.locations.map((loc): InvoiceRecord => ({
    id: Math.random().toString(36).substring(7),
    ...common,
    locationName: loc.locationName ?? '',
    nlcCode: loc.nlcCode ?? '',
    podCode: loc.podCode ?? '',
    address: loc.address ?? '',
    consumptionKwh: loc.consumptionKwh ?? 0,
    consumptionUnit: loc.consumptionUnit ?? 'kWh',
    sourceLine: 'Total loc de consum',
    status: toStatus(loc),
    observations: '',
  }));
}
