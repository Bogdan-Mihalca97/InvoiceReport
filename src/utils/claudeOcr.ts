/**
 * Claude Vision utilities for invoice processing.
 *
 * Two modes:
 *  - callClaudeOcrBatch()     — raw OCR text (legacy / Tesseract fallback path)
 *  - callClaudeExtractBatch() — structured JSON extraction (primary path when API key present)
 *
 * Concurrency is controlled by a shared semaphore (MAX_CONCURRENT = 2).
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-5';

const SYSTEM_PROMPT =
  'You are an OCR engine. Extract ALL text from each invoice image exactly as it appears. ' +
  'Preserve line breaks and the original layout. Do not interpret, summarize, or translate. ' +
  'Return only the raw extracted text.';

const MAX_RETRIES = 6;
const INITIAL_RETRY_DELAY_MS = 3000;
const BATCH_SIZE = 2; // pages per OCR call (legacy Tesseract path)

// Global semaphore — limits concurrent Claude API requests across all files/pages.
// With a 10k TPM limit and ~800 tokens/page, 2 concurrent requests is the sweet spot.
const MAX_CONCURRENT = 2;
let active = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>(resolve => waitQueue.push(resolve));
}

function releaseSlot(): void {
  const next = waitQueue.shift();
  if (next) {
    next();
  } else {
    active--;
  }
}

/** Single-page OCR — kept for backward compatibility. */
export async function callClaudeOcr(base64Image: string, apiKey: string): Promise<string> {
  const results = await callClaudeOcrBatch([base64Image], apiKey);
  return results[0];
}

/**
 * Batch OCR — sends up to BATCH_SIZE images in one API call.
 * Returns one extracted-text string per input image, in the same order.
 */
export async function callClaudeOcrBatch(base64Images: string[], apiKey: string): Promise<string[]> {
  await acquireSlot();
  try {
    return await callClaudeOcrBatchInner(base64Images, apiKey);
  } finally {
    releaseSlot();
  }
}

async function callClaudeOcrBatchInner(base64Images: string[], apiKey: string): Promise<string[]> {
  // Build content blocks: label + image for each page
  const content: object[] = [];
  for (let i = 0; i < base64Images.length; i++) {
    content.push({ type: 'text', text: `=== IMAGE ${i + 1} ===` });
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: base64Images[i] },
    });
  }
  const pageWord = base64Images.length === 1 ? 'image' : 'each image';
  content.push({
    type: 'text',
    text:
      `Extract all text from ${pageWord} above. ` +
      `For each image output its full text preceded by the marker "=== PAGE N ===" ` +
      `(where N matches the image number). Preserve line breaks and original layout.`,
  });

  let delay = INITIAL_RETRY_DELAY_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      delay *= 2;
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const rawText: string = data?.content?.[0]?.type === 'text' ? data.content[0].text : '';

    if (!rawText) throw new Error('Unexpected Claude API response structure');

    return splitBatchResponse(rawText, base64Images.length);
  }

  throw new Error(`Claude API rate limit exceeded after ${MAX_RETRIES} retries`);
}

/** Splits a batched response on "=== PAGE N ===" markers. */
function splitBatchResponse(raw: string, count: number): string[] {
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const startMarker = `=== PAGE ${i + 1} ===`;
    const endMarker = i + 1 < count ? `=== PAGE ${i + 2} ===` : null;
    const start = raw.indexOf(startMarker);
    const end = endMarker ? raw.indexOf(endMarker) : raw.length;
    if (start === -1) {
      // Marker missing — return whatever is left or empty
      results.push(i === 0 ? raw.trim() : '');
    } else {
      results.push(raw.slice(start + startMarker.length, end === -1 ? raw.length : end).trim());
    }
  }
  return results;
}

// ============================================================
// STRUCTURED JSON EXTRACTION
// ============================================================

export interface ExtractedInvoiceLevel {
  supplier: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;       // YYYY-MM-DD
  clientName: string | null;
  startDate: string | null;       // YYYY-MM-DD
  endDate: string | null;         // YYYY-MM-DD
  totalPayment: number | null;
}

export interface ExtractedLocation {
  locationName: string | null;
  nlcCode: string | null;
  podCode: string | null;
  address: string | null;
  consumptionKwh: number | null;
  consumptionUnit: 'kWh' | 'MWh' | null;
}

export interface ExtractedBatchResult {
  invoiceLevel: ExtractedInvoiceLevel;
  locations: ExtractedLocation[];
}

const EXTRACT_SYSTEM_PROMPT =
  'You are a structured data extractor for Romanian electricity invoices. ' +
  'Return ONLY valid JSON — no markdown fences, no explanation.\n\n' +

  'ROMANIAN NUMBER RULES (critical):\n' +
  '- Dot is ALWAYS a thousands separator: "1.224" = 1224, "3.022" = 3022\n' +
  '- Comma is ALWAYS a decimal separator: "1.224,56" = 1224.56\n' +
  '- A plain "1.224" with no comma after it = 1224 (integer), NOT 1.224 decimal\n' +
  '- PRESERVE the sign: "-1.224 kWh" = -1224, "+1.224 kWh" = 1224\n' +
  '- Examples: "1.224 kWh" → 1224 | "-1.559 kWh" → -1559 | "3.022" → 3022\n\n' +

  'FIELD RULES:\n' +
  '- invoiceNumber: must start with "EFI" followed by digits (e.g. "EFI2437541971" or "EFI/2437541971"). ' +
  'If no such value is found return null — do not invent or use other identifiers.\n' +
  '- locationName: the SHORT INSTALLATION NAME, typically found in the section header after ' +
  '"DETALII LOC DE CONSUM –" e.g. "POMPE CANALIZARE", "ILUM.OBREJA T.N.", "IL.MIHALT PT1". ' +
  'It describes what the location is (a pump station, street lighting, etc.), NOT a street address. ' +
  'If the section header is "DETALII LOC DE CONSUM – POMPE CANALIZARE – energie" extract "POMPE CANALIZARE". ' +
  'Only return null if there is absolutely no installation name anywhere near the NLC code.\n' +
  '- podCode: look for "POD:" followed by a number, e.g. "Info instalație: POD: 59402040001795147" ' +
  'or "POD: 7001931263". Extract the number after "POD:". ' +
  'It may appear in an "Info instalație" line or in a table row. ' +
  'Only return null if you truly cannot find any "POD:" label on any page.\n' +
  '- address: the full street/locality address of the consumption point, ' +
  'e.g. "Localitatea MIHALT, Strada PRINCIPALA, Nr 1FNSP1, Judet Alba". ' +
  'Strip "Cod postal XXXXX" from the end.\n\n' +

  'LOCATION RULES (critical):\n' +
  '- Only add an entry to "locations" for a dedicated per-NLC section ' +
  '(e.g. a "DETALII LOC DE CONSUM" block, or a table row that has its own NLC code + address).\n' +
  '- Every valid location MUST have a non-null nlcCode (exactly 10–12 digits).\n' +
  '- Do NOT create location entries for: summary rows, grand-total rows, client header rows, ' +
  'or any row without its own NLC code.\n' +
  '- consumptionKwh: read the "Total loc de consum" row value that belongs to THAT specific NLC ' +
  'section — not the invoice grand total. Match each NLC to its OWN row carefully.\n' +
  '- When multiple NLCs are listed in a table, read each row independently: ' +
  'row 1 NLC → row 1 consumption, row 2 NLC → row 2 consumption. Do not mix rows.\n' +
  '- If a page is a cover/preamble with no per-NLC sections, set locations to [].\n\n' +

  'invoiceLevel fields are invoice-wide (same for all locations): ' +
  'supplier, invoiceNumber, issueDate, clientName, startDate, endDate, totalPayment.\n' +
  'Dates must be YYYY-MM-DD. Use null for any field not visible on these pages.';

const EXTRACT_SCHEMA_PROMPT =
  'Return this exact JSON structure (no other text):\n' +
  '{\n' +
  '  "invoiceLevel": {\n' +
  '    "supplier": string|null,\n' +
  '    "invoiceNumber": string|null,\n' +
  '    "issueDate": "YYYY-MM-DD"|null,\n' +
  '    "clientName": string|null,\n' +
  '    "startDate": "YYYY-MM-DD"|null,\n' +
  '    "endDate": "YYYY-MM-DD"|null,\n' +
  '    "totalPayment": number|null\n' +
  '  },\n' +
  '  "locations": [\n' +
  '    {\n' +
  '      "locationName": string|null,\n' +
  '      "nlcCode": "10-to-12-digit string"|null,\n' +
  '      "podCode": string|null,\n' +
  '      "address": string|null,\n' +
  '      "consumptionKwh": number|null,\n' +
  '      "consumptionUnit": "kWh"|"MWh"|null\n' +
  '    }\n' +
  '  ]\n' +
  '}\n' +
  'REMINDERS:\n' +
  '- Numbers: "1.224 kWh" → 1224 | "-1.559 kWh" → -1559\n' +
  '- invoiceNumber must start with EFI, else null\n' +
  '- locationName = installation name from section header (e.g. "POMPE CANALIZARE"), not a street address\n' +
  '- podCode: number after "POD:" label (e.g. "POD: 59402040001795147"), null only if not found\n' +
  '- Each NLC gets its OWN row\'s consumption. Only include locations with their own nlcCode.';

/**
 * Structured extraction — sends up to BATCH_SIZE images (and optional plain-text pages)
 * in one API call and returns a partial invoice data object.
 * Multiple batch results are merged by the caller.
 */
export async function callClaudeExtractBatch(
  base64Images: string[],
  apiKey: string,
  plainTextPages: string[] = [],
): Promise<ExtractedBatchResult> {
  await acquireSlot();
  try {
    return await callClaudeExtractBatchInner(base64Images, apiKey, plainTextPages);
  } finally {
    releaseSlot();
  }
}

async function callClaudeExtractBatchInner(
  base64Images: string[],
  apiKey: string,
  plainTextPages: string[],
): Promise<ExtractedBatchResult> {
  const empty: ExtractedBatchResult = {
    invoiceLevel: { supplier: null, invoiceNumber: null, issueDate: null, clientName: null, startDate: null, endDate: null, totalPayment: null },
    locations: [],
  };

  const content: object[] = [];

  // Add plain-text pages first (from PDF.js extraction)
  for (let i = 0; i < plainTextPages.length; i++) {
    content.push({ type: 'text', text: `=== TEXT PAGE ${i + 1} ===\n${plainTextPages[i]}` });
  }

  // Add image pages
  for (let i = 0; i < base64Images.length; i++) {
    content.push({ type: 'text', text: `=== IMAGE PAGE ${i + 1} ===` });
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: base64Images[i] },
    });
  }

  content.push({ type: 'text', text: EXTRACT_SCHEMA_PROMPT });

  let delay = INITIAL_RETRY_DELAY_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: EXTRACT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      delay *= 2;
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const rawText: string = data?.content?.[0]?.type === 'text' ? data.content[0].text : '';
    if (!rawText) return empty;

    try {
      // Strip any accidental markdown code fences
      const jsonStr = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      const parsed = JSON.parse(jsonStr);
      return {
        invoiceLevel: parsed.invoiceLevel ?? empty.invoiceLevel,
        locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      };
    } catch {
      console.warn('Claude extract: failed to parse JSON response', rawText.substring(0, 200));
      return empty;
    }
  }

  throw new Error(`Claude API rate limit exceeded after ${MAX_RETRIES} retries`);
}

export { BATCH_SIZE };
