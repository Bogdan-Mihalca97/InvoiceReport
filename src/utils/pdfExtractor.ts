import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker - use jsdelivr CDN which is more reliable
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extracts text content from a PDF file using OCR for image-based PDFs
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // First try to extract text directly (for text-based PDFs)
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += pageText + '\n\n--- PAGE BREAK ---\n\n';
    }

    // Check if we got meaningful text (excluding PAGE BREAK markers)
    const textWithoutMarkers = fullText.replace(/---\s*PAGE\s*BREAK\s*---/gi, '').trim();
    const hasEnoughContent = textWithoutMarkers.length > 100;

    console.log(`Text extraction: ${textWithoutMarkers.length} chars of actual content`);

    if (hasEnoughContent) {
      console.log(`Extracted text from ${pdf.numPages} pages (text-based PDF)`);
      console.log('Total extracted text length:', fullText.length);
      return fullText;
    }

    // Otherwise, the PDF is likely image-based, use OCR
    console.log('Text extraction yielded minimal results (image-based PDF detected), using OCR on all pages...');
    fullText = '';

    // Create Tesseract worker for OCR
    const worker = await createWorker('ron'); // Romanian language

    try {
      // Process all pages with OCR to capture multiple NLC numbers
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Running OCR on page ${pageNum}...`);
        const page = await pdf.getPage(pageNum);

        // Render page to canvas
        const viewport = page.getViewport({ scale: 3.0 }); // Higher scale for better OCR
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Failed to get canvas context');
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        // Perform OCR on the rendered page
        const { data } = await worker.recognize(canvas);
        fullText += data.text + '\n\n--- PAGE BREAK ---\n\n';

        console.log(`OCR completed for page ${pageNum}`);
      }

      console.log('OCR completed successfully for all pages');
      console.log('Total extracted text length:', fullText.length);
      console.log('First 500 characters:', fullText.substring(0, 500));
    } finally {
      await worker.terminate();
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
