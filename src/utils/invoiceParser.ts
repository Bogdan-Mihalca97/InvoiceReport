import { InvoiceRecord } from '@/types/invoice';

// ============================================================
// SUPPLIER DETECTION
// ============================================================

/**
 * Identifies the supplier from the invoice text
 */
function identifySupplier(text: string): string {
  const upperText = text.toUpperCase();

  // PPC Energie detection
  if (upperText.includes('PPC ENERGIE') || upperText.includes('COD ELECTEL') || upperText.includes('MYPPC')) {
    return 'PPC ENERGIE';
  }

  // NOVA POWER&GAS detection
  if (upperText.includes('NOVA POWER') || upperText.includes('VREAULANOVA') || upperText.includes('NOVAPG')) {
    return 'NOVA POWER&GAS';
  }

  // TINMAR ENERGY detection
  if (upperText.includes('TINMAR')) {
    return 'TINMAR ENERGY';
  }

  // ELECTRICA / E-DISTRIBUTIE detection
  if (upperText.includes('E-DISTRIBUTIE') || upperText.includes('E-DISTRIBUȚIE') || upperText.includes('EDISTRIBUTIE') || upperText.includes('ELECTRICA')) {
    return 'ELECTRICA';
  }

  // Other suppliers (can be extended later)
  if (upperText.includes('PREMIER ENERGY') || upperText.includes('PREMIER')) {
    return 'PREMIER ENERGY';
  }
  if (upperText.includes('CEZ') || upperText.includes('C.E.Z')) {
    return 'CEZ VÂNZARE';
  }
  if (upperText.includes('ENEL')) {
    return 'ENEL ENERGIE';
  }
  if (upperText.includes('E.ON') || upperText.includes('EON ')) {
    return 'E.ON';
  }

  return 'NECUNOSCUT';
}

// ============================================================
// COMMON EXTRACTION FUNCTIONS
// ============================================================

/**
 * Extracts dates in various formats
 */
function extractDate(text: string, label: string): string {
  const patterns = [
    new RegExp(`${label}[\\s:]*([0-9]{1,2})[\\.]([0-9]{1,2})[\\.]([0-9]{4})`, 'i'),
    new RegExp(`${label}[\\s:]*([0-9]{1,2})[\\-]([0-9]{1,2})[\\-]([0-9]{4})`, 'i'),
    new RegExp(`${label}[\\s:]*([0-9]{4})[\\-]([0-9]{2})[\\-]([0-9]{2})`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[3]?.length === 4) {
        // DD.MM.YYYY or DD-MM-YYYY
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      } else if (match[1]?.length === 4) {
        // YYYY-MM-DD
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
  }

  return '';
}

/**
 * Parses Romanian number format (dot as thousands, comma as decimal)
 */
function parseRomanianNumber(value: string): number {
  // Remove spaces
  value = value.replace(/\s/g, '');

  // Count digits after dot/comma
  const dotMatch = value.match(/\.([0-9]+)$/);
  const commaMatch = value.match(/,([0-9]+)$/);

  if (dotMatch && dotMatch[1].length === 3 && !value.includes(',')) {
    // If dot followed by exactly 3 digits and no comma, it's thousands separator: 2.318 = 2318
    value = value.replace(/\./g, '');
  } else if (commaMatch && commaMatch[1].length === 3 && !value.includes('.')) {
    // If comma followed by exactly 3 digits and no dot, it's thousands separator: 2,318 = 2318
    value = value.replace(/,/g, '');
  } else {
    // Standard Romanian format: dots for thousands, comma for decimal
    // 30.075,79 = 30075.79
    value = value.replace(/\./g, '').replace(',', '.');
  }

  return parseFloat(value);
}

// ============================================================
// ELECTRICA-SPECIFIC EXTRACTION FUNCTIONS
// ============================================================

/**
 * Extracts invoice number for ELECTRICA invoices
 */
function extractElectricaInvoiceNumber(text: string): string {
  const patterns = [
    // EFI format: "Numarul facturii : EFI2437541971"
    /Numarul[\s]+facturii[\s:]+([A-Z]{2,5}[0-9]{5,})/i,
    /Serie[\s\/]+Nr\.?[\s:]*([A-Z0-9\/\-]{5,})/i,
    /ID[\s]+factur[aă][\s:]*([A-Z0-9\/\-]{5,})/i,
    /nr\.?\s*factur[aă][\s:]*([A-Z0-9\-\/]{5,})/i,
    /factura[\s]+nr\.?[\s:]*([A-Z0-9\-\/]{5,})/i,
    /seria\s+([A-Z]+)\s+nr\.?\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        return `${match[1]}-${match[2]}`;
      }
      const invoiceNum = match[1].trim();
      if (invoiceNum.length >= 5) {
        return invoiceNum;
      }
    }
  }

  return '';
}

/**
 * Extracts all NLC codes from ELECTRICA invoices
 */
function extractAllNlcCodes(text: string): string[] {
  const patterns = [
    /NLC[\s:)*\]]+([0-9]{10,12})/gi,
    /\(NLC\)[\s:]*([0-9]{10,12})/gi,
    /cod[\s]+loc[\s]+consum[\s:()NLC]*([0-9]{10,12})/gi,
    /loc[\s]+de[\s]+consum[\s:()NLC]*([0-9]{10,12})/gi,
    /COD[\s]+Loc[\s]+de[\s]+consum[\s:()NLC]*([0-9]{10,12})/gi,
  ];

  const nlcCodes = new Set<string>();

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const code = match[1].trim();
        if (code.length >= 10 && /^[0-9]+$/.test(code)) {
          nlcCodes.add(code);
        }
      }
    }
  }

  return Array.from(nlcCodes);
}

/**
 * Extracts NLC code (single occurrence) for ELECTRICA
 */
function extractNlcCode(text: string): string {
  const patterns = [
    /NLC[\s:)*\]]+([0-9]{10,12})/i,
    /\(NLC\)[\s:]*([0-9]{10,12})/i,
    /cod[\s]+loc[\s]+consum[\s:()NLC]*([0-9]{10,12})/i,
    /loc[\s]+de[\s]+consum[\s:()NLC]*([0-9]{10,12})/i,
    /COD[\s]+Loc[\s]+de[\s]+consum[\s:()NLC]*([0-9]{10,12})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const code = match[1].trim();
      if (code.length >= 10 && /^[0-9]+$/.test(code)) {
        return code;
      }
    }
  }

  return '';
}

/**
 * Extracts location name from ELECTRICA "DETALII LOC DE CONSUM – [name] - energie"
 */
function extractElectricaLocationName(text: string): string {
  const detailsMatch = text.match(/DETALII[\s]+LOC[\s]+DE[\s]+CONSUM[\s]*[–\-][\s]*([^–\-]+?)[\s]*[–\-][\s]*energie/i);
  if (detailsMatch) {
    return detailsMatch[1].trim();
  }

  const patterns = [
    /Localitatea[\s]+([A-Z][A-Za-z\s]+),[\s]*Comuna[\s]+([A-Z][A-Za-z\s]+)/i,
    /(?:locație|locatie|punct[\s]+de[\s]+consum)[\s:]*([^\n]{10,150})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        return `${match[1].trim()}, Comuna ${match[2].trim()}`;
      }
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extracts POD code for ELECTRICA
 */
function extractElectricaPodCode(text: string): string {
  const patterns = [
    /POD[\s:]*([0-9]{15,20})/i,
    /cod[\s]+punct[\s]+măsură[\s:]*([0-9]{15,20})/i,
    /Info[\s]+instalație[\s:]+POD[\s:]*([0-9]{15,20})/i,
    /(RO[0-9E]{10,20})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const code = match[1].trim();
      if (code.length >= 10) {
        return code;
      }
    }
  }

  return '';
}

/**
 * Extracts address for ELECTRICA
 */
function extractElectricaAddress(text: string, isSingleNlc: boolean = false): string {
  if (!isSingleNlc) {
    const addressMatch = text.match(/Adres[aă][\s]+loc[\s]+de[\s]+consum[\s:]*([^]*?)(?:Denumirea|Contract|COD[\s]+Loc|$)/i);
    if (addressMatch) {
      let address = addressMatch[1].trim();
      address = address.replace(/,?\s*Cod\s*postal\s*\d*/i, '').trim();
      address = address.replace(/,\s*$/, '').trim();
      if (address.length > 10) {
        return address;
      }
    }
  }

  const clientAddressPatterns = [
    /Adresa[\s]+de[\s]+coresponden[tț][aă][\s:]*([^\n]{20,200})/i,
    /Adres[aă][\s]+sediu[\s:]*([^\n]{20,200})/i,
    /CLIENT[\s\S]{0,100}?Adres[aă][\s:]*([^\n]{20,200})/i,
  ];

  for (const pattern of clientAddressPatterns) {
    const match = text.match(pattern);
    if (match) {
      let address = match[1].trim();
      address = address.replace(/,?\s*Cod\s*postal\s*\d*/i, '').trim();
      address = address.replace(/,\s*$/, '').trim();
      if (address.length > 10) {
        return address;
      }
    }
  }

  const patterns = [
    /Localitatea[\s]+([^\n]{20,200}?)(?:Denumirea|Contract|COD)/i,
    /(?:str\.|strada|bd\.|bulevardul)[\s]*([^\n]{10,150})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extracts consumption in kWh for ELECTRICA
 */
function extractElectricaConsumption(text: string): { value: number; sourceLine: string } {
  const patterns = [
    /Total[\s]+loc[\s]+de[\s]+consum[\s:]*(-?[0-9,.]+)[\s]*kWh/i,
    /Total[\s]+energie[\s]+activ[aă][\s:]*(-?[0-9,.]+)[\s]*kWh/i,
    // Table format: "Total energie activă" | 42 | kWh  (number and kWh in separate columns)
    /Total[\s]+energie[\s]+activ[aă]\s+(\d+)\s+kWh/i,
    /energie[\s]+activ[aă][\s:]*(-?[0-9,.]+)[\s]*kWh/i,
    // DETALII CITIRI table: "Energie activă" row with Cantitate column
    /Energie[\s]+activ[aă][^\n]*?Cantitate[\s:]+(-?[0-9,.]+)/i,
    /Cantitate[\s]+facturată[\s:]*(-?[0-9,.]+)[\s]*kWh/i,
    // "Total loc de consum" row in the detailed table with kWh value
    /Total[\s]+loc[\s]+de[\s]+consum\s+(\d+)\s+kWh/i,
    /(?:consum|cantitate)[\s:]*(-?[0-9,.]+)[\s]*(?:kWh|kwh)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseRomanianNumber(match[1]);
      if (!isNaN(num) && Math.abs(num) < 10000000) {
        console.log(`Consumption found: ${num} kWh`);
        return { value: Math.round(num), sourceLine: 'Energie activă' };
      }
    }
  }

  return { value: 0, sourceLine: '' };
}

/**
 * Extracts total payment for ELECTRICA
 */
function extractElectricaTotalPayment(text: string): number {
  const detailsPattern = /Total[\s]+de[\s]+plat[aă][\s:]*(-?[0-9.,]+)[\s]*lei/i;
  const detailsMatch = text.match(detailsPattern);
  if (detailsMatch) {
    const num = parseRomanianNumber(detailsMatch[1]);
    if (!isNaN(num)) {
      return parseFloat(num.toFixed(2));
    }
  }

  const afterSoldPattern = /SOLD[\s]+ANTERIOR[\s\S]{0,200}?TOTAL[\s]+DE[\s]+PLAT[AĂ][\s\S]{0,50}?(-?[0-9]+[.,][0-9]{2})/i;
  const afterSoldMatch = text.match(afterSoldPattern);
  if (afterSoldMatch) {
    const num = parseRomanianNumber(afterSoldMatch[1]);
    if (!isNaN(num)) {
      return parseFloat(num.toFixed(2));
    }
  }

  const patterns = [
    /TOTAL[\s]+DE[\s]+PLAT[AĂ][\s]*\(LEI\)[\s:]*(-?[0-9.,]+)/i,
    /TOTAL[\s]+DE[\s]+PLAT[AĂ][\s:]*(-?[0-9.,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseRomanianNumber(match[1]);
      if (!isNaN(num)) {
        return parseFloat(num.toFixed(2));
      }
    }
  }

  return 0;
}

/**
 * Extracts billing period for ELECTRICA
 */
function extractElectricaBillingPeriod(text: string): { startDate: string; endDate: string } {
  const billingPatterns = [
    // dot-separated (standard)
    /Perioad[aă][\s]+de[\s]+facturare[\s:]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})[\s\-–]+([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i,
    /Period[aă][\s]+de[\s]+facturare[\s:]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})[\s\-–]+([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i,
    /facturare[\s:]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})[\s\-–]+([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i,
    /([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})[\s]*[\-–][\s]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/,
  ];

  for (const pattern of billingPatterns) {
    const match = text.match(pattern);
    if (match) {
      const startDay = match[1].padStart(2, '0');
      const startMonth = match[2].padStart(2, '0');
      const startYear = match[3];
      const endDay = (match[4] ?? '').padStart(2, '0');
      const endMonth = (match[5] ?? '').padStart(2, '0');
      const endYear = match[6] ?? '';
      return {
        startDate: `${startYear}-${startMonth}-${startDay}`,
        endDate: endYear ? `${endYear}-${endMonth}-${endDay}` : '',
      };
    }
  }

  // EFI format: start and end on separate labelled lines with slashes
  const efiStart = text.match(/Data\s+de\s+inceput\s+a\s+perioadei\s+de\s+facturare[\s:]+([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/i);
  const efiEnd   = text.match(/Data\s+de\s+sfarsit\s+a\s+perioadei\s+de\s+facturare[\s:]+([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/i);
  if (efiStart) {
    const fmt = (d: string, m: string, y: string) => `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    return {
      startDate: fmt(efiStart[1], efiStart[2], efiStart[3]),
      endDate: efiEnd ? fmt(efiEnd[1], efiEnd[2], efiEnd[3]) : '',
    };
  }

  return { startDate: '', endDate: '' };
}

/**
 * Extracts the text section relevant to a specific NLC code (ELECTRICA)
 * Includes continuation pages (tables that span multiple pages)
 */
function extractNlcSection(text: string, nlcCode: string, skipFirstPage: boolean = false): string {
  // Strategy 1: Use "DETALII LOC DE CONSUM" sections (best for multi-NLC)
  // This captures everything between two section headers, regardless of page breaks
  const detailsPattern = /DETALII\s+LOC\s+DE\s+CONSUM/gi;
  const detailsMatches = [...text.matchAll(detailsPattern)];

  for (let i = 0; i < detailsMatches.length; i++) {
    const matchStart = detailsMatches[i].index!;
    const matchEnd = i < detailsMatches.length - 1 ? detailsMatches[i + 1].index! : text.length;
    const section = text.substring(matchStart, matchEnd);

    if (section.includes(nlcCode)) {
      console.log(`NLC ${nlcCode}: found in DETALII section (${section.length} chars)`);
      return section;
    }
  }

  // Strategy 2: Page-based - find the page with the NLC and include subsequent pages
  // until the next NLC/DETALII section starts
  const pages = text.split(/---\s*PAGE\s*BREAK\s*---/i);
  const startIndex = skipFirstPage ? 1 : 0;

  for (let i = startIndex; i < pages.length; i++) {
    if (pages[i].includes(nlcCode)) {
      // Found the NLC on this page - now include continuation pages
      let section = pages[i];

      // Add subsequent pages that DON'T start a new NLC section
      for (let j = i + 1; j < pages.length; j++) {
        const nextPage = pages[j];
        // Stop if next page has a new "DETALII LOC DE CONSUM" or a different NLC code
        if (/DETALII\s+LOC\s+DE\s+CONSUM/i.test(nextPage) ||
            /COD\s+Loc\s+de\s+consum\s*\(NLC\)/i.test(nextPage)) {
          break;
        }
        // Include this continuation page (it's part of the same NLC's data)
        section += '\n' + nextPage;
      }

      console.log(`NLC ${nlcCode}: found on page ${i}, section ${section.length} chars`);
      return section;
    }
  }

  // Strategy 3: Row-bounded extraction — for tabular formats where multiple NLC codes
  // appear on the same page (no DETALII headers, no per-NLC pages).
  // Extract from the NLC code occurrence to just before the next NLC code occurrence.
  const nlcPattern = /\b(\d{10,12})\b/g;
  const allNlcOccurrences: Array<{ index: number; code: string }> = [];
  let nlcMatch: RegExpExecArray | null;
  while ((nlcMatch = nlcPattern.exec(text)) !== null) {
    allNlcOccurrences.push({ index: nlcMatch.index, code: nlcMatch[1] });
  }

  const thisOccurrence = allNlcOccurrences.find(o => o.code === nlcCode);
  if (thisOccurrence) {
    // Find the next occurrence that is a DIFFERENT code
    const nextOther = allNlcOccurrences.find(o => o.index > thisOccurrence.index && o.code !== nlcCode);
    const sectionStart = Math.max(0, thisOccurrence.index - 500);
    const sectionEnd = nextOther ? nextOther.index : Math.min(text.length, thisOccurrence.index + 3000);
    const section = text.substring(sectionStart, sectionEnd);
    console.log(`NLC ${nlcCode}: strategy 3 row-bounded section (${section.length} chars)`);
    console.log(`NLC ${nlcCode} section preview:`, section.substring(0, 300));
    return section;
  }

  console.log(`NLC ${nlcCode}: fallback — returning full text`);
  return text;
}

// ============================================================
// PPC-SPECIFIC EXTRACTION FUNCTIONS
// ============================================================

/**
 * Normalizes PPC invoice text by collapsing spurious spaces that PDF.js inserts
 * between a letter and a following Romanian diacritic.
 * e.g. "Adres ă   loc consum" → "Adresă   loc consum"
 *      "Total de plat ă   factur ă   curent ă" → "Total de plată   factură   curentă"
 */
function normalizePPCText(text: string): string {
  return text.replace(/([a-zA-Z]) ([ăâîșțĂÂÎȘȚşţ])/g, '$1$2');
}

/**
 * Extracts invoice number for PPC invoices
 * Formats:
 *   "seria 25EI nr 06295537"
 *   "Anexa la factura seria 25EI nr 06295537"
 *   "Factură fiscală seria 24EI nr. 01539286 din data de 25.01.2024"
 */
function extractPPCInvoiceNumber(text: string): string {
  const patterns = [
    /Factur[aă]\s+fiscal[aă]\s+seria[\s]+([A-Z0-9]+)[\s]+nr\.?[\s]+([0-9]+)/i,
    /seria[\s]+([A-Z0-9]+)[\s]+nr\.?[\s]+([0-9]+)/i,
    /factura[\s]+seria[\s]+([A-Z0-9]+)[\s]+nr\.?[\s]+([0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return `${match[1]} ${match[2]}`;
    }
  }

  return '';
}

/**
 * Extracts issue date for PPC invoices
 * Format: "din data de 24.02.2025"
 */
function extractPPCIssueDate(text: string): string {
  const patterns = [
    /din[\s]+data[\s]+de[\s]+([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i,
    /data[\s]+facturii[\s:]+([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
  }

  return '';
}

/**
 * Extracts client name for PPC invoices
 * Looks in the CLIENT section
 */
function extractPPCClientName(text: string): string {
  console.log('Extracting PPC client name...');

  const isExcluded = (name: string) => {
    const excluded = /^(NON)?CASNIC$|^PIATA|^FACTURA|^PLATA|^ANTERIOR|^CURENT|^CONCURENTIAL|^FURNIZOR|^DISTRIBUITOR/i;
    return excluded.test(name.trim());
  };

  // Look for CLIENT section followed by name
  const patterns = [
    // CLIENT followed by name, then Adresa/Cod/etc
    /CLIENT\s+([A-Z][A-Z\s\.\-]+?)[\s\n]+(?:Adresa|Adres[aă]|Cod|CUI|CIF)/gi,
    // CLIENT followed by uppercase name
    /CLIENT\s+([A-Z][A-Z\s\.\-]{3,50})/gi,
    // COMUNA/PRIMARIA patterns
    /(COMUNA\s+[A-Z]+)/gi,
    /(PRIMARIA\s+[A-Z]+)/gi,
    // Look for name after "Adresă de corespondență" header
    /Adres[aă]\s+de\s+coresponden[tț][aă]\s*[\n\r]+\s*([A-Z][A-Z\s\.\-]{3,50})/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let name = match[1].trim().replace(/\s+/g, ' ');
      console.log('Found potential client name:', name);
      if (name.length >= 5 && !isExcluded(name) && /^[A-Z\s\.\-]+$/.test(name)) {
        return name;
      }
    }
  }

  // Fallback: look for "Adresă de corespondență" with client name BEFORE it
  const correspondenceMatch = text.match(/([A-Z][A-Z\s\.\-]{5,50})\s*[\n\r]+\s*Adres[aă]\s+de\s+coresponden/i);
  if (correspondenceMatch) {
    const name = correspondenceMatch[1].trim();
    if (!isExcluded(name)) {
      return name;
    }
  }

  return '';
}

/**
 * Extracts all ELECTEL codes from PPC invoices
 * Format: "Cod ELECTEL: 541393231, POD: RO005E541393231"
 * ELECTEL codes can be extracted from the POD codes (RO005E + ELECTEL)
 */
function extractAllElectelCodes(text: string): string[] {
  const electelCodes = new Set<string>();

  // Primary: Extract from "Cod ELECTEL:" pattern (must have exact "Cod ELECTEL")
  const electelPattern = /Cod\s+ELECTEL[\s:,]+(\d{9})/gi;
  const electelMatches = text.matchAll(electelPattern);
  for (const match of electelMatches) {
    if (match[1]) {
      electelCodes.add(match[1].trim());
    }
  }

  // Secondary: Extract from POD codes (RO005E followed by 9 digits = ELECTEL code)
  // POD format: RO005E541393231 where 541393231 is the ELECTEL code
  const podPattern = /POD[\s:,]+RO\d{3}E(\d{9})/gi;
  const podMatches = text.matchAll(podPattern);
  for (const match of podMatches) {
    if (match[1]) {
      electelCodes.add(match[1].trim());
    }
  }

  console.log('Found ELECTEL codes:', Array.from(electelCodes));
  return Array.from(electelCodes);
}

/**
 * Extracts single ELECTEL code for PPC
 * Must specifically match "Cod ELECTEL" or extract from POD
 */
function extractElectelCode(text: string): string {
  // Try "Cod ELECTEL:" pattern first
  const electelMatch = text.match(/Cod\s+ELECTEL[\s:,]+(\d{9})/i);
  if (electelMatch) {
    return electelMatch[1].trim();
  }

  // Try to extract from POD code
  const podMatch = text.match(/POD[\s:,]+RO\d{3}E(\d{9})/i);
  if (podMatch) {
    return podMatch[1].trim();
  }

  return '';
}

/**
 * Extracts POD code for PPC invoices
 * Format: "POD: RO005E541393231"
 */
function extractPPCPodCode(text: string): string {
  const patterns = [
    /POD[\s:]+([A-Z0-9]{15,25})/i,
    /(RO[0-9]{3}E[0-9]{9,15})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extracts location name for PPC invoices
 * Format: "CAMIN" or "BLOC SPECIALISTI" at the start, followed by "Adresă loc consum:"
 */
function extractPPCLocationName(text: string): string {
  console.log('Extracting PPC location from text (first 300 chars):', text.substring(0, 300));

  const isExcluded = (name: string) =>
    name.includes('ELECTEL') ||
    name.includes('POD') ||
    /^(Adres|Cod\s|Nivel|Oferta|Pagina|Interval|Specificat|Anexa|Furnizor)/i.test(name);

  // Pattern 0: Reference number + dash + name  e.g. "133007450/08.05.2014 - ILUMINAT PUBLIC"
  const refWithNameMatch = text.match(/^\d[\d\/\.]+\s*-\s*([A-Z][A-Z0-9\s\(\)\/\.\-]{2,80}?)[\r\n]/im);
  if (refWithNameMatch) {
    const name = refWithNameMatch[1].trim();
    console.log('Found location from ref+name line:', name);
    if (name.length >= 3 && !isExcluded(name)) {
      return name;
    }
  }

  // Pattern 1: Location name right before "Adresă loc consum" (with possible newline or space)
  // Allows lowercase start: "CAMIN", "BLOC SPECIALISTI", "apartament NR.127B"
  const beforeAddressMatch = text.match(/^([A-Za-zÀ-žÁ-ú][^\r\n]{2,80}?)(?:-\d+[\/\d\.]*)?[\s\r\n]+\s*Adres[aă]\s+loc\s+consum/im);
  if (beforeAddressMatch) {
    let name = beforeAddressMatch[1].trim();
    name = name.replace(/-\d+.*$/, '').trim();
    console.log('Found location before address:', name);
    if (name.length >= 3 && !isExcluded(name)) {
      return name;
    }
  }

  // Pattern 2: First line at start of text (location header)
  const firstLineMatch = text.match(/^([A-Za-zÀ-žÁ-ú][^\r\n]{2,80}?)[\r\n]/m);
  if (firstLineMatch) {
    let name = firstLineMatch[1].trim();
    name = name.replace(/-\d+.*$/, '').trim();
    console.log('Found location from first line:', name);
    if (name.length >= 3 && !isExcluded(name)) {
      return name;
    }
  }

  // Pattern 3: Location with reference number (e.g., "CENTRU DE INFORMARE TURISTICA-137689441/16.09.2014")
  const locationWithRefMatch = text.match(/^([A-Z][A-Z0-9\s]{3,60})-\d+/m);
  if (locationWithRefMatch) {
    const name = locationWithRefMatch[1].trim();
    console.log('Found location name with ref:', name);
    if (name.length >= 3 && !isExcluded(name)) {
      return name;
    }
  }

  // Pattern 4: Look for location as standalone line before "Cod ELECTEL"
  const beforeElectelMatch = text.match(/^([A-Za-zÀ-žÁ-ú][^\r\n]{2,80}?)[\s\r\n]+(?:Adres|Cod\s+ELECTEL)/im);
  if (beforeElectelMatch) {
    let name = beforeElectelMatch[1].trim();
    name = name.replace(/-\d+.*$/, '').trim();
    console.log('Found location before ELECTEL:', name);
    if (name.length >= 3 && !isExcluded(name)) {
      return name;
    }
  }

  return '';
}

/**
 * Extracts address for PPC invoices
 * Format: "Adresă loc consum: Strada BANIA, nr. 129..." or "Adresă loc consum Strada BANIA, localitate BANIA..."
 */
function extractPPCAddress(text: string): string {
  const patterns = [
    // Pattern with colon
    /Adres[aă]\s+loc\s+consum\s*:\s*([^\n]{10,200})/i,
    // Pattern without colon - address starts with Strada/Str./etc
    /Adres[aă]\s+loc\s+consum\s+((?:Strada|Str\.|Calea|Bd\.|Bulevardul|Aleea|Piata|Pia[tț]a)[^\n]{10,200})/i,
    // Pattern without colon - any text after "Adresă loc consum"
    /Adres[aă]\s+loc\s+consum\s+([A-Z][^\n]{10,200})/i,
    // Look for address pattern after location name (format: "LOCATION-REF\nAdresă loc consum ADDRESS")
    /\n\s*Adres[aă]\s+loc\s+consum\s+([^\n]{10,200})/i,
    // Alternative patterns
    /Adres[aă]\s+sediu\s+social\s*:\s*([^\n]{10,200})/i,
    /Adres[aă]\s+de\s+coresponden[tț][aă]\s*:\s*([^\n]{10,200})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let address = match[1].trim();
      console.log('Found potential address:', address.substring(0, 80));

      // Truncate at known labels that follow the address on the same extracted line
      address = address.replace(/\s*Ofert[aă]\s*\/\s*Tarif.*$/i, '').trim();
      address = address.replace(/\s*Nivel\s+tensiune.*$/i, '').trim();
      address = address.replace(/\s*Putere\s+avizat[aă].*$/i, '').trim();
      address = address.replace(/\s*Interval\s+citire.*$/i, '').trim();
      // Remove cod poștal at end
      address = address.replace(/,?\s*cod\s*po[sș]tal\s*\d*/i, '').trim();
      address = address.replace(/,\s*$/, '').trim();
      // Remove trailing 6-digit codes
      address = address.replace(/\s+\d{6}$/, '').trim();

      // Don't return if it looks like it's part of a table or code
      if (address.length > 10 && !/^\d+$/.test(address) && !/^[A-Z]{2,3}\d/.test(address)) {
        return address;
      }
    }
  }

  return '';
}


/**
 * Extracts net kWh from "Acciză"/"Accize" rows in "Servicii facturate".
 * Takes the Cantitate facturată from "Acciză" rows only (excludes "Acciză estimată anterior").
 * Acciză (excise duty) is levied on net consumption → the most reliable kWh source for PPC.
 * Romanian number format: dot=thousands separator, comma=decimal (e.g. "3.022,00", "184,000").
 */
function extractPPCServiceTableKwh(text: string): { value: number; sourceLine: string } {
  const servStart = text.search(/Servicii\s+facturate/i);
  const scope = servStart >= 0 ? text.substring(servStart) : text;

  // [\s\S]{0,200}? bridges multi-line PDF.js column output between label and quantity.
  // Strict Romanian format: dot=thousands, comma=decimal, optional decimal part.
  // Negative lookahead skips "Acciză estimată anterior" — those rows have no kWh U.M.
  const rowPattern = /Acciz[aă](?!\s+estimat[aă]?\s+anterior)[\s\S]{0,200}?(-?\d{1,3}(?:\.\d{3})*(?:,\d{2,3})?)\s*kWh/gi;
  const matches = [...scope.matchAll(rowPattern)];
  if (matches.length === 0) return { value: 0, sourceLine: '' };

  let total = 0;
  for (const m of matches) {
    const num = parseRomanianNumber(m[1]);
    if (!isNaN(num)) total += num;
  }
  return { value: Math.round(total), sourceLine: 'Acciză (Servicii facturate)' };
}

/**
 * Extracts single consumption for PPC invoices (fallback)
 * Used when no specific periods are found
 */
function extractPPCConsumption(text: string): { value: number; sourceLine: string } {
  // No "Servicii facturate" table → location has 0 consumption (no excise duty charged)
  if (!/Servicii\s+facturate/i.test(text)) {
    return { value: 0, sourceLine: 'no Servicii facturate' };
  }

  // Primary: Acciză rows give the most reliable net kWh for all PPC invoice types
  const fromAcciza = extractPPCServiceTableKwh(text);
  if (fromAcciza.value !== 0) return fromAcciza;

  return { value: 0, sourceLine: 'Acciză not found' };
}

/**
 * Extracts total payment for PPC invoices.
 * Priority:
 *   1. Numbered "Total de plată (N=...)" row — grand total including any outstanding balance
 *      e.g. "6. Total de plată (6=4+5) lei -5.671,61"
 *   2. "Total de plata factura curenta" — current-invoice total (Format A)
 *      e.g. "5. Total de plata factura curenta (5=4) lei 6.984,89"
 *   3. "Valoare factură curentă" — current-invoice amount (Format B, regularisation invoices)
 */
function extractPPCTotalPayment(text: string): number {
  const patterns = [
    // Priority 1: invoice-level "N. Total de plată (N=...)" — excludes per-location "loc consum" rows
    /\d+\.\s+Total\s+de\s+plat[aă](?!\s+factur[aă])(?!\s+loc\s+consum)[\s\S]{0,50}?\([^)]+\)[\s\S]{0,200}?(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    // Priority 2: "Total de plata factura curenta" — current invoice total (Format A)
    /Total\s+de\s+plat[aă]\s+factur[aă]\s+curent[aă][\s\S]{0,150}?(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    // Priority 3: "Valoare factură curentă" — Format B regularisation invoices
    /Valoare\s+factur[aă]\s+curent[aă][\s\S]{0,200}?(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseRomanianNumber(match[1]);
      if (!isNaN(num)) {
        return parseFloat(num.toFixed(2));
      }
    }
  }

  return 0;
}

/**
 * Extracts per-location total (TVA-inclusive) from a PPC location section.
 * Targets "Total de plată factură curentă/loc consum cu TVA [N=...] 12,28"
 * (row with "cu TVA" — NOT the ex-TVA row that appears one line above it).
 * Amount may be on the same or next column line in PDF.js output.
 */
function extractPPCLocationTotal(sectionText: string): number {
  if (!/Servicii\s+facturate/i.test(sectionText)) return 0;
  const patterns = [
    // Primary: "loc consum cu TVA" row — TVA-inclusive total
    /loc\s+consum\s+cu\s+TVA[\s\S]{0,150}?(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    // Fallback: numbered row "N. Total de plată ... loc consum cu TVA ... amount"
    /\d+\.\s*Total\s+de\s+plat[aă][^(]*loc\s+consum\s+cu\s+TVA[\s\S]{0,150}?(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = sectionText.match(pattern);
    if (match) {
      const num = parseRomanianNumber(match[1]);
      if (!isNaN(num)) return parseFloat(num.toFixed(2));
    }
  }
  return 0;
}

/**
 * Extracts billing period for PPC invoices
 * Formats:
 *   "Perioadă facturare: 16.10.2024-31.01.2025"  (same line)
 *   "Perioadă facturare:\n23.10.2024-30.11.2024"  (OCR — date on next line)
 */
function extractPPCBillingPeriod(text: string): { startDate: string; endDate: string } {
  const patterns = [
    /Perioad[aă][\s]+facturare[\s\S]{0,30}?([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})[\s]*[\-–][\s]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i,
    /Perioad[aă][\s]+de[\s]+facturare[\s\S]{0,30}?([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})[\s]*[\-–][\s]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const startDay = match[1].padStart(2, '0');
      const startMonth = match[2].padStart(2, '0');
      const startYear = match[3];
      const endDay = match[4].padStart(2, '0');
      const endMonth = match[5].padStart(2, '0');
      const endYear = match[6];
      return {
        startDate: `${startYear}-${startMonth}-${startDay}`,
        endDate: `${endYear}-${endMonth}-${endDay}`,
      };
    }
  }

  return { startDate: '', endDate: '' };
}

/**
 * Extracts the text section for a specific ELECTEL code (PPC).
 *
 * Strategy: use "Adresă loc consum" as section boundaries — every location block
 * (named or unnamed) contains exactly one "Adresă loc consum" line.  We look back
 * up to two lines before each occurrence to capture any location name or reference
 * number that precedes it (e.g. "ILUMINAT PUBLIC NEGOI 2(PT 275)" or
 * "133007450/08.05.2014 - ILUMINAT PUBLIC").
 */
function extractElectelSection(text: string, electelCode: string): string {
  const addrPattern = /Adres[aă]\s+loc\s+consum/gi;
  const addrMatches = [...text.matchAll(addrPattern)];

  if (addrMatches.length > 0) {
    for (let i = 0; i < addrMatches.length; i++) {
      const addrPos = addrMatches[i].index!;
      const sectionEnd = i < addrMatches.length - 1 ? addrMatches[i + 1].index! : text.length;

      // Look back up to 300 chars to include the 1-2 lines before "Adresă loc consum"
      // (location name or reference number line)
      const lookbackStart = Math.max(0, addrPos - 300);
      const pre = text.substring(lookbackStart, addrPos);
      const lastNL = pre.lastIndexOf('\n');
      const prevNL = lastNL > 0 ? pre.lastIndexOf('\n', lastNL - 1) : -1;
      const sectionStart = lookbackStart + (prevNL >= 0 ? prevNL + 1 : 0);

      const section = text.substring(sectionStart, sectionEnd);
      if (section.includes(electelCode)) {
        console.log(`Found ELECTEL ${electelCode} in addr-bounded section ${i}`);
        return section.trim();
      }
    }
  }

  // Fallback: extract around code with generous context
  const codeIndex = text.indexOf(electelCode);
  if (codeIndex === -1) return text;
  const start = Math.max(0, codeIndex - 800);
  const end = Math.min(text.length, codeIndex + 3000);
  console.log(`Using fallback extraction for ELECTEL ${electelCode}`);
  return text.substring(start, end).trim();
}

// ============================================================
// MWH DECIMAL PARSER (for NOVA and TINMAR)
// ============================================================

/**
 * Parses MWh values that always use comma as decimal separator.
 * "0,659" → 0.659, "3,322000" → 3.322, "137,3470" → 137.347
 * Uses the "always decimal" interpretation regardless of digit count after comma.
 */
function parseMwhDecimal(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}

// ============================================================
// NOVA POWER&GAS-SPECIFIC EXTRACTION FUNCTIONS
// ============================================================

/**
 * Extracts invoice number for NOVA invoices
 * Format: "Factură fiscală: Serie: NPE Nr.: 225205278"
 */
function extractNovaInvoiceNumber(text: string): string {
  const patterns = [
    /Factur[aă]\s+fiscal[aă]:\s+Serie:\s+([A-Z]+)\s+Nr\.\s*:\s+(\d+)/i,
    /Serie:\s+([A-Z]+)\s+Nr\.\s*:\s+(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
  }
  return '';
}

/**
 * Extracts issue date for NOVA invoices
 * Format: "Dată emitere: 06/10/2025" (DD/MM/YYYY with slashes)
 */
function extractNovaIssueDate(text: string): string {
  const match = text.match(/Dat[aă]\s+emitere:\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    return `${match[3]}-${month}-${day}`;
  }
  // Fallback: DD.MM.YYYY adjacent
  const match2 = text.match(/Dat[aă]\s+emitere:\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
  if (match2) {
    const day = match2[1].padStart(2, '0');
    const month = match2[2].padStart(2, '0');
    return `${match2[3]}-${month}-${day}`;
  }
  // Broad fallback: columnar PDFs where label and value are far apart (up to 500 chars)
  // e.g. compensation invoices where all labels appear first, then all values
  const match3 = text.match(/Dat[aă]\s+emitere:[\s\S]{0,500}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
  if (match3) {
    const day = match3[1].padStart(2, '0');
    const month = match3[2].padStart(2, '0');
    return `${match3[3]}-${month}-${day}`;
  }
  return '';
}

/**
 * Extracts client name for NOVA invoices
 * Format: "Client: MUNICIPIUL ORASTIE"
 */
function extractNovaClientName(text: string): string {
  const match = text.match(/Client:\s+([A-Z][A-Z\s\.\-]+?)(?:\s*\n|\s{2,}|Cod\s+Client)/i);
  if (match) {
    return match[1].trim().replace(/\s+/g, ' ');
  }
  // Fallback: look for client before address on first page
  const match2 = text.match(/MUNICIPIUL\s+[A-Z]+/);
  if (match2) return match2[0].trim();
  return '';
}

/**
 * Extracts total payment for NOVA invoices
 * Format: "TOTAL DE PLATĂ lei 130.649,74"
 */
function extractNovaTotalPayment(text: string): number {
  // NPE multi-location invoices: use "VALOARE FACTURA CURENTA lei [amount]" (current-period total,
  // excludes previous balance). PRO/NCD invoices fall back to "TOTAL DE PLATĂ lei [amount]".
  const patterns = [
    /VALOARE\s+FACTUR[AĂ]\s+CURENT[AĂ]\s+lei\s+(-?[\d.,]+)/i,
    /TOTAL\s+DE\s+PLAT[AĂ]\s+lei\s+(-?[\d.,]+)/i,
    /TOTAL\s+DE\s+PLAT[AĂ]\s+(-?[\d.,]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseRomanianNumber(match[1]);
      if (!isNaN(num) && num !== 0) return parseFloat(num.toFixed(2));
    }
  }
  return 0;
}

/**
 * Extracts billing period for NOVA invoices
 * Format: "Perioada de facturare: [optional text] 01.07.2025 - 31.08.2025"
 * The text between the label and dates may contain "Factură Piața Concurențială" etc.
 */
function extractNovaBillingPeriod(text: string): { startDate: string; endDate: string } {
  // Allow any characters between label and dates (lazy match)
  // Dot format: "01.07.2025 - 31.08.2025" (NPE electricity)
  const match = text.match(
    /Perioada\s+de\s+facturare:[\s\S]{0,80}?(\d{1,2})\.(\d{1,2})\.(\d{4})\s*[-–]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i
  );
  if (match) {
    return {
      startDate: `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`,
      endDate: `${match[6]}-${match[5].padStart(2, '0')}-${match[4].padStart(2, '0')}`,
    };
  }
  // Slash format: "01/10/2025 - 31/12/2025" (NCD gas)
  const matchSlash = text.match(
    /Perioada\s+de\s+facturare:[\s\S]{0,80}?(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i
  );
  if (matchSlash) {
    return {
      startDate: `${matchSlash[3]}-${matchSlash[2].padStart(2, '0')}-${matchSlash[1].padStart(2, '0')}`,
      endDate: `${matchSlash[6]}-${matchSlash[5].padStart(2, '0')}-${matchSlash[4].padStart(2, '0')}`,
    };
  }
  return { startDate: '', endDate: '' };
}


interface NovaLocationData {
  pod: string;
  nlcCode: string;
  locationName: string;
  address: string;
  consumptionMwh: number;
  isGas: boolean;
  startDate: string;
  endDate: string;
  totalPayment: number;
}

/**
 * Extracts location data from a single NOVA page section
 */
function extractNovaLocationFromPage(pageText: string): NovaLocationData {
  // POD: standard "POD: RO005E..." or compensation format "POD/CLC: RO005E..."
  const podMatch = pageText.match(/POD:\s*(RO[0-9A-Z]{10,20})/i)
                || pageText.match(/POD\/CLC:\s*(RO[0-9A-Z]{10,20})/i);
  const pod = podMatch ? podMatch[1].trim() : '';

  // NLC: electricity "Cod unic locație: LC-XXXXXXXX" or gas "Cod loc de consum: DEG0414289"
  const nlcMatch = pageText.match(/Cod\s+unic\s+loca[tț]ie:\s+(LC-[\d]+)/i)
                || pageText.match(/Cod\s+loc(?:\s+de)?\s+consum:\s+(\S+)/i);
  const nlcCode = nlcMatch ? nlcMatch[1].trim() : '';

  // Location name (Nume locatie/locație: ... stop at "Cod unic", triple-space, or end)
  const locNameMatch = pageText.match(/Nume\s+loca[tț]ie:\s+(.*?)(?:\s+Cod\s+unic|\s{3,}|$)/i);
  let locationName = locNameMatch ? locNameMatch[1].trim() : '';
  // Strip CPV procurement code prefix: e.g. 'CPV 09123000-7, "Locuinte sociale..."' → 'Locuinte sociale...'
  locationName = locationName.replace(/^CPV\s+[\d\-]+,?\s*/i, '').replace(/^[""]|[""]$/g, '').trim();

  // Address: handles "A dresa loc de consum:" (NPE split) and "Adresă loc de consum:" (NCD/compensation)
  // Stop before next field: Num[eă] locatie, Num ă r contract (PRO), Cod unic, POD (compensation format),
  // Nivel tensiune, Perioadă facturare, or newline
  const addrMatch = pageText.match(
    /(?:A\s+dresa|Adres[aă])\s+loc\s+de\s+consum:\s+(.*?)(?:\s+Num[eă]\s+loca[tț]ie:|\s+Num\s*[aă]\s*r?\s+contract|\s+Cod\s+unic|\s+POD[:\s\/]|\s+Nivel\s+tensiune|\s+Perioad[aă]\s+facturare:|\s*\n|$)/i
  );
  let address = addrMatch ? addrMatch[1].trim() : '';
  address = address.replace(/,?\s*Cod\s+[Pp]ostal[:\s]*\d*/i, '').trim();
  address = address.replace(/,\s*$/, '').trim();

  // Consumption (electricity): use FIRST "Pret de baza energie electrica fara Tg ... MWh [value]"
  // from the service items table. This is more reliable than the meter table row because:
  // - Meter table can have multiple "Energie activă" rows (different sub-periods), causing wrong greediness
  // - The "Pret de baza" row has the billed quantity in the format "MWh [value]" (value AFTER MWh)
  // Consumption (gas): "Cantitatea facturată (MWh/mc): 0,156751" or "CONSUM GAZE NATURALE MWh 0,156751"
  let consumptionMwh = 0;
  let isGas = false;
  const pretDeBasaMatch = pageText.match(
    /Pret\s+de\s+baza\s+energie\s+electrica\s+fara\s+Tg[\s\S]{0,60}?MWh\s+(-?[\d,]+)/i
  );
  if (pretDeBasaMatch) {
    consumptionMwh = parseMwhDecimal(pretDeBasaMatch[1]);
  } else {
    const gasMatch = pageText.match(/Cantitat(?:ea\s+factur[aă]t[aă]|e\s+factur[aă]t[aă])\s*\([^)]*\)[:\s]+(-?[\d,]+)/i)
                  || pageText.match(/CONSUM\s+GAZE\s+NATURALE\s+MWh\s+(-?[\d,]+)/i);
    if (gasMatch) { consumptionMwh = parseMwhDecimal(gasMatch[1]); isGas = true; }
  }

  // Billing period per location: "Perioada/Perioadă facturare: DD.MM.YYYY-DD.MM.YYYY" or "DD/MM/YYYY-DD/MM/YYYY"
  let startDate = '';
  let endDate = '';
  const periodDot = pageText.match(
    /Perioad[aă]\s+facturare:\s+(\d{1,2})\.(\d{1,2})\.(\d{4})[-–](\d{1,2})\.(\d{1,2})\.(\d{4})/i
  );
  const periodSlash = pageText.match(
    /Perioad[aă]\s+facturare:\s+(\d{1,2})\/(\d{1,2})\/(\d{4})[-–](\d{1,2})\/(\d{1,2})\/(\d{4})/i
  );
  const periodMatch = periodDot || periodSlash;
  if (periodMatch) {
    startDate = `${periodMatch[3]}-${periodMatch[2].padStart(2, '0')}-${periodMatch[1].padStart(2, '0')}`;
    endDate = `${periodMatch[6]}-${periodMatch[5].padStart(2, '0')}-${periodMatch[4].padStart(2, '0')}`;
  }

  // Total per location: "TOTAL DE PLATA FACTURA CURENTA/LOC CONSUM [AMOUNT] [TVA]"
  const totalMatch = pageText.match(/TOTAL\s+DE\s+PLATA\s+FACTURA\s+CURENTA\/LOC\s+CONSUM\s+([\d,.]+)/i);
  let totalPayment = 0;
  if (totalMatch) {
    const num = parseRomanianNumber(totalMatch[1]);
    if (!isNaN(num)) totalPayment = parseFloat(num.toFixed(2));
  }

  return { pod, nlcCode, locationName, address, consumptionMwh, isGas, startDate, endDate, totalPayment };
}

// ============================================================
// TINMAR ENERGY-SPECIFIC EXTRACTION FUNCTIONS
// ============================================================

/**
 * Extracts invoice number for TINMAR invoices
 * Format: "Serie: TINM25C- Nr.: 3959" → "TINM25C-3959"
 *         "Serie: TE25RP- Nr.: 31"    → "TE25RP-31"
 */
function extractTinmarInvoiceNumber(text: string): string {
  // Match any TINMAR series (TINM25C, TE25RP, etc.)
  const serieMatch = text.match(/Serie:\s+([A-Z0-9]+)-\s+Nr\.:\s+(\d+)/i);
  if (serieMatch) return `${serieMatch[1]}-${serieMatch[2]}`;
  // Fallback: extract from annex header "Anexa la factura: SERIES-NR/DD.MM.YYYY"
  const annexMatch = text.match(/Anexa\s+la\s+factura:?\s+([A-Z0-9\-]+)\/[\d.]+/i);
  if (annexMatch) return annexMatch[1].trim();
  return '';
}

/**
 * Extracts issue date for TINMAR invoices
 * PDF layout reorders columns, so "Data emitere:" label may not be adjacent to its value.
 * Primary: extract from annex reference "Anexa la factura TINM25C-3959/21.03.2025"
 * Fallback: first date after "Data emitere:" allowing intervening text
 */
function extractTinmarIssueDate(text: string): string {
  // Best source: annex header "Anexa la factura: TE25RP-31/10.03.2025" or "Anexa la factura TINM25C-3959/21.03.2025"
  const annexMatch = text.match(/Anexa\s+la\s+factura:?\s+[A-Z0-9\-]+\/(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
  if (annexMatch) {
    return `${annexMatch[3]}-${annexMatch[2].padStart(2, '0')}-${annexMatch[1].padStart(2, '0')}`;
  }
  // Fallback: Date emitere with possible intervening text (column layout)
  const match = text.match(/Data\s+emitere:[\s\S]{0,60}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  return '';
}

/**
 * Extracts client name for TINMAR invoices
 * In PDF.js extraction, client name appears BEFORE "Cumparator:" (column layout artifact)
 * Also appears before "Grup Facturare"
 */
function extractTinmarClientName(text: string): string {
  // Name appears just before "Cumparator:" label (right-column layout)
  const beforeCumMatch = text.match(/([A-Z][A-Z\s]+)\s+Cumparator:/i);
  if (beforeCumMatch) {
    const name = beforeCumMatch[1].trim().replace(/\s+/g, ' ');
    if (name.length >= 5 && !/TREZORERIA|BANCA|TERMEN|SCADENT/i.test(name)) return name;
  }
  // Name at top before "Grup Facturare"
  const match2 = text.match(/([A-Z][A-Z\s]+)\s+Grup\s+Facturare/i);
  if (match2) return match2[1].trim().replace(/\s+/g, ' ');
  return '';
}

/**
 * Extracts the total client balance for TINMAR invoices (includes unpaid previous invoices).
 * Label: "Sold total client (sold anterior + facturi curente)"
 */
function extractTinmarSoldTotal(text: string): number {
  const match = text.match(/Sold\s+total\s+client[^0-9-]*(-?[\d.,]+)/i);
  if (match) {
    const num = parseRomanianNumber(match[1]);
    if (!isNaN(num) && num !== 0) return parseFloat(num.toFixed(2));
  }
  return 0;
}

/**
 * Extracts "TOTAL DE PLATĂ" for NOVA invoices — full amount including any unpaid balance.
 */
function extractNovaSoldTotal(text: string): number {
  const match = text.match(/TOTAL\s+DE\s+PLAT[AĂ]\s+lei\s+(-?[\d.,]+)/i)
             || text.match(/TOTAL\s+DE\s+PLAT[AĂ]\s+(-?[\d.,]+)/i);
  if (match) {
    const num = parseRomanianNumber(match[1]);
    if (!isNaN(num) && num !== 0) return parseFloat(num.toFixed(2));
  }
  return 0;
}

/**
 * Extracts total payment for TINMAR invoices
 * Format: "Total factura curenta 143.789,17" or "Total factura curenta -78,58" (negative = credit)
 */
function extractTinmarTotalPayment(text: string): number {
  const patterns = [
    /Total\s+factura\s+curenta\s+(-?[\d.,]+)/i,
    /Total\s+baza\s+de\s+impozitare\s+TVA:\s+(-?[\d.,]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseRomanianNumber(match[1]);
      if (!isNaN(num) && num !== 0) return parseFloat(num.toFixed(2));
    }
  }
  return 0;
}

/**
 * Extracts billing period for TINMAR invoices
 * Format: "Perioada: [01.07.2024-28.02.2025]"
 */
function extractTinmarBillingPeriod(text: string): { startDate: string; endDate: string } {
  const match = text.match(
    /Perioada:\s+\[(\d{1,2})\.(\d{1,2})\.(\d{4})-(\d{1,2})\.(\d{1,2})\.(\d{4})\]/i
  );
  if (match) {
    return {
      startDate: `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`,
      endDate: `${match[6]}-${match[5].padStart(2, '0')}-${match[4].padStart(2, '0')}`,
    };
  }
  // Fallback: "De la data: DD.MM.YYYY Pana la data: DD.MM.YYYY"
  const match2 = text.match(/De\s+la\s+data:\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s+Pana\s+la\s+data:\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
  if (match2) {
    return {
      startDate: `${match2[3]}-${match2[2].padStart(2, '0')}-${match2[1].padStart(2, '0')}`,
      endDate: `${match2[6]}-${match2[5].padStart(2, '0')}-${match2[4].padStart(2, '0')}`,
    };
  }
  return { startDate: '', endDate: '' };
}

interface TinmarLocationData {
  pod: string;
  locationName: string;
  address: string;
  consumptionKwh: number;
  consumptionUnit: 'kWh' | 'MWh';
  totalPayment: number;
  startDate: string;
  endDate: string;
}

/**
 * Extracts all location sections from TINMAR annex pages
 * Section header format: "RO005EXXXXXXX - PTZ N – Str. Name(Pod: RO005EXXXXXXX) - Romania, ..."
 */
function extractTinmarLocations(text: string): TinmarLocationData[] {
  const locations: TinmarLocationData[] = [];

  // Pattern to match TINMAR location section headers.
  // Address capture uses lazy (.+?Cod postal: NNNNN) to stop before the next section header;
  // previously ([^\n]+) consumed the entire page, swallowing subsequent headers on the same page.
  const headerPattern = /(RO005E[0-9A-Z]+)\s*-\s*(PT[ZA]\s+\d+\s*[–\-]\s*[^(]+)\(Pod:\s*RO005E[0-9A-Z]+\)\s*-\s*(.+?Cod\s+postal[:\s]*[-\d]+)/gi;

  const headers: Array<{ index: number; pod: string; locationName: string; address: string }> = [];

  let headerMatch: RegExpExecArray | null;
  while ((headerMatch = headerPattern.exec(text)) !== null) {
    let address = headerMatch[3].trim();
    // Remove "Cod postal: XXXXX" suffix
    address = address.replace(/,?\s*Cod\s+postal[:\s]*[-\d]*/i, '').trim();
    // Remove any trailing invoice item rows that start with "  NN   " (item number pattern)
    address = address.replace(/\s{2,}\d+\s+.*$/s, '').trim();
    address = address.replace(/,\s*$/, '').trim();

    headers.push({
      index: headerMatch.index,
      pod: headerMatch[1].trim(),
      locationName: headerMatch[2].trim().replace(/\s*[–\-]\s*$/, '').trim(),
      address,
    });
  }

  for (let i = 0; i < headers.length; i++) {
    const sectionStart = headers[i].index;
    const sectionEnd = i < headers.length - 1 ? headers[i + 1].index : text.length;
    const section = text.substring(sectionStart, sectionEnd);

    // Take FIRST "Pret de baza energie electrica fara Tg MWh [AMOUNT]" row only.
    // Regularization invoices have multiple such rows (one per sub-period); summing gives inflated results.
    // Use parseMwhDecimal so "0,659" → 0.659 (not 659 via thousands-separator logic)
    const baseEnergyMatch = section.match(/Pret\s+de\s+baza\s+energie\s+electrica\s+fara\s+Tg\s+MWh\s+(-?[\d,]+)/i);
    const totalMwh = baseEnergyMatch ? parseMwhDecimal(baseEnergyMatch[1]) : 0;
    // Store as MWh (matching invoice unit); ×1000 would give wrong display value
    const consumptionKwh = !isNaN(totalMwh) && totalMwh !== 0 ? parseFloat(totalMwh.toFixed(6)) : 0;

    // Total per location: prefer "Total factura curenta [AMOUNT]", fallback "Total cu TVA: [AMOUNT]"
    // Amount can be negative (e.g. credit/storno invoices)
    const totalMatch = section.match(/Total\s+factura\s+curenta\s+(-?[\d.,]+)/i)
                    || section.match(/Total\s+cu\s+TVA:\s+(-?[\d.,]+)/i);
    let totalPayment = 0;
    if (totalMatch) {
      const num = parseRomanianNumber(totalMatch[1]);
      if (!isNaN(num)) totalPayment = parseFloat(num.toFixed(2));
    }

    // Per-section billing period: look for the first pair of space-separated dates in the section.
    // The meter reading table has "De la | Pana la" as column headers, but in PDF.js output all
    // column headers are joined into one string ("De la Pana la M E AC Initial Final MWh ..."),
    // so the actual dates appear far from the labels. However, the data row has two consecutive
    // DD.MM.YYYY dates separated by a space (e.g. "01.02.2025 28.02.2025"), whereas date ranges
    // in service item descriptions use a hyphen ("01.08.2024-31.08.2024") — not space-separated.
    const meterDatesMatch = section.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    const secStart = meterDatesMatch
      ? `${meterDatesMatch[3]}-${meterDatesMatch[2].padStart(2, '0')}-${meterDatesMatch[1].padStart(2, '0')}`
      : '';
    const secEnd = meterDatesMatch
      ? `${meterDatesMatch[6]}-${meterDatesMatch[5].padStart(2, '0')}-${meterDatesMatch[4].padStart(2, '0')}`
      : '';

    locations.push({
      pod: headers[i].pod,
      locationName: headers[i].locationName,
      address: headers[i].address,
      consumptionKwh,
      consumptionUnit: 'MWh',
      totalPayment,
      startDate: secStart,
      endDate: secEnd,
    });
  }

  // Fallback for single-location TINMAR invoices (e.g. TE25RP prosumer format)
  // These don't have "RO005E... - PTZ N – Str.(Pod:...)" section headers in the annex
  if (locations.length === 0) {
    const singleLoc = extractTinmarSingleLocation(text);
    if (singleLoc) locations.push(singleLoc);
  }

  return locations;
}

/**
 * Extracts location data from single-location TINMAR invoices (prosumer / TE25RP format)
 * Page 1 format: "Punct de Consum: RO005EXXXXXXX - [NAME]" and "Cod POD: RO005EXXXXXXX"
 */
function extractTinmarSingleLocation(text: string): TinmarLocationData | null {
  // POD: "Cod POD: RO005E531457265" or "Cod POD: RO005EXXXXXXX"
  const podMatch = text.match(/Cod\s+POD:\s+(RO[0-9A-Z]{10,20})/i) ||
                   text.match(/POD:\s*(RO[0-9A-Z]{10,20})/i);
  if (!podMatch) return null;
  const pod = podMatch[1].trim();

  // Location name: "Punct de Consum: RO005EXXXXXXX - [NAME] - PROS  Adresa:"
  // Use lazy match stopping at " - PROS" or double-space (field separator in joined PDF text)
  const locMatch = text.match(/Punct\s+(?:de\s+)?Consum:\s+RO[0-9A-Z]+\s*-\s*(.+?)(?:\s+-\s+PROS\b|\s{2,}|$)/i);
  let locationName = locMatch ? locMatch[1].trim() : '';
  locationName = locationName.replace(/\s*-\s*PROS\s*$/, '').trim();

  // Address: "Adresa: [addr]  Cod POD:" or "Adresa Loc Consum: [addr], Cod postal: NNN"
  // Lazy match stopping before "Cod POD", "Cod postal", or double-space
  const addrMatch = text.match(/Adresa(?:\s+Loc\s+Consum)?:\s+(.*?)(?:\s+Cod\s+(?:POD|postal)|\s{2,}|$)/i);
  let address = addrMatch ? addrMatch[1].trim() : '';
  address = address.replace(/,?\s*(?:sector\s*[,.]?)?\s*cod\s+postal[:\s]*\d*/i, '').trim();
  address = address.replace(/,\s*$/, '').trim();

  // Consumption: prefer "Energie electrica consumata din retea (kwh): NNN"
  // (actual energy drawn from grid for prosumer invoices)
  let consumptionKwh = 0;
  const consumedMatch = text.match(/Energie\s+electrica\s+consumata\s+din\s+retea\s*\([^)]*\)\s*[-:]*\s*([\d.,]+)/i);
  if (consumedMatch) {
    const v = parseRomanianNumber(consumedMatch[1]);
    if (!isNaN(v)) consumptionKwh = Math.round(v);
  } else {
    // Fallback: absolute value of MWh excedent from invoice line item
    // e.g. "Energie produsa si livrata in retea - excedent MWh -0,1520"
    const mwhMatch = text.match(/livrata\s+in\s+retea\s*-\s*excedent\s+MWh\s+(-?[\d,]+)/i);
    if (mwhMatch) {
      const mwh = Math.abs(parseMwhDecimal(mwhMatch[1]));
      if (!isNaN(mwh)) consumptionKwh = Math.round(mwh * 1000);
    }
  }

  return { pod, locationName, address, consumptionKwh, consumptionUnit: 'kWh', totalPayment: 0, startDate: '', endDate: '' };
}

// ============================================================
// COMMON CLIENT NAME EXTRACTION (fallback)
// ============================================================

function extractClientName(text: string): string {
  const isExcluded = (name: string) => {
    const excluded = /^(NON)?CASNIC$|^PIATA|^FACTURA|^PLATA|^ANTERIOR|^CURENT|^CONCURENTIAL|^NONCASNIC/i;
    return excluded.test(name.trim());
  };

  const clientPatterns = [
    /CLIENT[\s\n]+([A-Z][A-Z\s\.\-]+?)[\s\n]+(?:Adresa|Cod|CUI|CIF)/gi,
    /CLIENT[\s\n]+([A-Z][A-Z\s\.\-]{3,50})/gi,
  ];

  for (const pattern of clientPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let name = match[1].trim().replace(/\s+/g, ' ');
      if (name.length >= 5 && !isExcluded(name) && /^[A-Z\s\.\-]+$/.test(name)) {
        return name;
      }
    }
  }

  const fallbackPatterns = [
    /(?:consumator|beneficiar)[\s:]*([A-Z][A-Z\s\.\-]+)/gi,
    /(?:nume|denumire)[\s:]*([A-Z][A-Z\s\.\-]+)/gi,
  ];

  for (const pattern of fallbackPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let name = match[1].trim().replace(/\s+/g, ' ');
      if (name.length >= 5 && !isExcluded(name) && /^[A-Z\s\.\-]+$/.test(name)) {
        return name;
      }
    }
  }

  return '';
}

// ============================================================
// MAIN PARSING FUNCTION
// ============================================================

/**
 * Parses invoice text and extracts structured data
 * Automatically detects supplier and uses appropriate extraction logic
 */
export function parseInvoiceText(text: string, fileName: string): InvoiceRecord[] {
  console.log(`\n=== Parsing ${fileName} ===`);
  console.log('Text length:', text.length);

  // Detect supplier first
  const supplier = identifySupplier(text);
  console.log('Detected supplier:', supplier);

  // Route to appropriate parser based on supplier
  if (supplier === 'PPC ENERGIE') {
    return parsePPCInvoice(text, fileName, supplier);
  } else if (supplier === 'NOVA POWER&GAS') {
    return parseNovaInvoice(text, fileName, supplier);
  } else if (supplier === 'TINMAR ENERGY') {
    return parseTinmarInvoice(text, fileName, supplier);
  } else {
    // Default to ELECTRICA parser (works for most Romanian invoices)
    return parseElectricaInvoice(text, fileName, supplier);
  }
}

/**
 * Parses ELECTRICA invoices
 */
function parseElectricaInvoice(text: string, fileName: string, supplier: string): InvoiceRecord[] {
  console.log('Using ELECTRICA parser');

  // Extract common fields
  const invoiceNumber = extractElectricaInvoiceNumber(text);
  let issueDate = extractDate(text, '(?:data[\\s]+emiterii|data[\\s]+emitere|emis[aă]|dat[aă])');

  // EFI format: "Data facturii : 31.12.2024"
  if (!issueDate) {
    const efiDateMatch = text.match(/Data\s+facturii[\s:]+([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i);
    if (efiDateMatch) {
      issueDate = `${efiDateMatch[3]}-${efiDateMatch[2].padStart(2,'0')}-${efiDateMatch[1].padStart(2,'0')}`;
    }
  }

  if (!issueDate) {
    const serieMatch = text.match(/Serie[\s\/]+Nr\.?[\s:]*[A-Z0-9\/\-]{5,}[\s\S]{0,200}?([0-9]{1,2})[\.]([0-9]{1,2})[\.]([0-9]{4})/i);
    if (serieMatch) {
      const day = serieMatch[1].padStart(2, '0');
      const month = serieMatch[2].padStart(2, '0');
      const year = serieMatch[3];
      issueDate = `${year}-${month}-${day}`;
    }
  }

  const clientName = extractClientName(text);
  const totalPayment = extractElectricaTotalPayment(text);
  const billingPeriod = extractElectricaBillingPeriod(text);

  // Find all NLC codes
  const pages = text.split(/---\s*PAGE\s*BREAK\s*---/i);

  // EFI preamble detection: pages that have an EFI invoice number header but no NLC/DETALII content
  // are financial attachments — skip them and start from the first page with real invoice content.
  const isEfiPreamblePage = (p: string) =>
    /Numarul\s+facturii[\s:]+EFI\d+/i.test(p) &&
    !extractAllNlcCodes(p).length &&
    !/DETALII\s+LOC\s+DE\s+CONSUM/i.test(p);

  let preamblePageCount = 0;
  while (preamblePageCount < pages.length && isEfiPreamblePage(pages[preamblePageCount])) {
    preamblePageCount++;
  }
  if (preamblePageCount > 0) {
    console.log(`EFI preamble: skipping first ${preamblePageCount} page(s)`);
  }

  const allNlcCodes = extractAllNlcCodes(text);

  // Check if the invoice has "DETALII LOC DE CONSUM" sections (detail pages)
  const hasDetailSections = /DETALII\s+LOC\s+DE\s+CONSUM/i.test(text);

  // Skip preamble pages + page 1 (summary) for multi-NLC or DETALII invoices
  const pagesToSkip = preamblePageCount + ((allNlcCodes.length > 1 || hasDetailSections) && pages.length > preamblePageCount + 1 ? 1 : 0);
  const shouldSkipFirstPage = pagesToSkip > 0;
  const textWithoutFirstPage = shouldSkipFirstPage
    ? pages.slice(pagesToSkip).join('\n\n--- PAGE BREAK ---\n\n')
    : text;
  const nlcCodes = shouldSkipFirstPage
    ? extractAllNlcCodes(textWithoutFirstPage)
    : allNlcCodes;

  console.log('Extracted common fields:', {
    supplier,
    invoiceNumber,
    issueDate,
    clientName,
    totalPayment,
    billingPeriod,
    nlcCodesFound: nlcCodes.length,
    hasDetailSections,
    shouldSkipFirstPage,
  });

  // If no NLC codes found, create a single record using full text
  if (nlcCodes.length === 0) {
    const locationName = extractElectricaLocationName(text);
    const nlcCode = extractNlcCode(text);
    const podCode = extractElectricaPodCode(text);
    const address = extractElectricaAddress(text, true);
    const consumption = extractElectricaConsumption(text);

    const record = createInvoiceRecord(
      fileName, supplier, invoiceNumber, issueDate, clientName,
      locationName, nlcCode, podCode, address,
      billingPeriod.startDate, billingPeriod.endDate,
      consumption.value, consumption.sourceLine, totalPayment
    );

    return [record];
  }

  // Create a record for each NLC code
  const records: InvoiceRecord[] = [];

  for (const nlcCode of nlcCodes) {
    // Always use the text without the first page for section extraction
    // This prevents picking up summary/total values from page 1 or TOTAL FACTURARE page
    const nlcSection = extractNlcSection(textWithoutFirstPage, nlcCode, false);
    const locationName = extractElectricaLocationName(nlcSection);
    const podCode = extractElectricaPodCode(nlcSection);
    const address = extractElectricaAddress(nlcSection);
    const consumption = extractElectricaConsumption(nlcSection);

    console.log(`NLC ${nlcCode} section (first 500 chars):`, nlcSection.substring(0, 500));
    console.log(`NLC ${nlcCode}:`, {
      locationName,
      podCode,
      address: address.substring(0, 50),
      consumption: consumption.value,
      consumptionSource: consumption.sourceLine,
    });

    const record = createInvoiceRecord(
      fileName, supplier, invoiceNumber, issueDate, clientName,
      locationName, nlcCode, podCode, address,
      billingPeriod.startDate, billingPeriod.endDate,
      consumption.value, consumption.sourceLine, totalPayment
    );

    records.push(record);
  }

  return records;
}

/**
 * Parses PPC invoices
 */
function parsePPCInvoice(text: string, fileName: string, supplier: string): InvoiceRecord[] {
  console.log('Using PPC parser');

  // Normalize text: PDF.js inserts spaces before Romanian diacritics (e.g. "Adres ă" → "Adresă").
  // This must happen before any pattern matching.
  const normalizedText = normalizePPCText(text);

  // Extract common fields from first page
  const invoiceNumber = extractPPCInvoiceNumber(normalizedText);
  const issueDate = extractPPCIssueDate(normalizedText);
  const clientName = extractPPCClientName(normalizedText) || extractClientName(normalizedText);
  const totalPayment = extractPPCTotalPayment(normalizedText);
  const billingPeriod = extractPPCBillingPeriod(normalizedText);

  // Find all ELECTEL codes
  const electelCodes = extractAllElectelCodes(normalizedText);

  console.log('Extracted common fields:', {
    supplier,
    invoiceNumber,
    issueDate,
    clientName,
    totalPayment,
    billingPeriod,
    electelCodesFound: electelCodes.length,
  });

  // If no ELECTEL codes found, try splitting by "Adresă loc consum" for multi-location invoices
  if (electelCodes.length === 0) {
    const addrPattern = /Adres[aă]\s+loc\s+consum/gi;
    const addrMatches = [...normalizedText.matchAll(addrPattern)];

    if (addrMatches.length > 1) {
      // Multi-location without ELECTEL — iterate addr-bounded sections
      const records: InvoiceRecord[] = [];
      for (let i = 0; i < addrMatches.length; i++) {
        const addrPos = addrMatches[i].index!;
        const sectionEnd = i < addrMatches.length - 1 ? addrMatches[i + 1].index! : normalizedText.length;
        const lookbackStart = Math.max(0, addrPos - 300);
        const pre = normalizedText.substring(lookbackStart, addrPos);
        const lastNL = pre.lastIndexOf('\n');
        const prevNL = lastNL > 0 ? pre.lastIndexOf('\n', lastNL - 1) : -1;
        const sectionStart = lookbackStart + (prevNL >= 0 ? prevNL + 1 : 0);
        const section = normalizedText.substring(sectionStart, sectionEnd).trim();

        const locationName = extractPPCLocationName(section);
        const podCode = extractPPCPodCode(section);
        const electelCode = extractElectelCode(section);
        const address = extractPPCAddress(section);
        const locTotal = extractPPCLocationTotal(section);
        const consumption = extractPPCConsumption(section);
        records.push(createInvoiceRecord(
          fileName, supplier, invoiceNumber, issueDate, clientName,
          locationName, electelCode, podCode, address,
          billingPeriod.startDate, billingPeriod.endDate,
          consumption.value, consumption.sourceLine, locTotal,
          'kWh', totalPayment
        ));
      }
      if (records.length > 0) return records;
    }

    // Single location fallback
    const locationName = extractPPCLocationName(normalizedText);
    const electelCode = extractElectelCode(normalizedText);
    const podCode = extractPPCPodCode(normalizedText);
    const address = extractPPCAddress(normalizedText);
    const consumption = extractPPCConsumption(normalizedText);

    const record = createInvoiceRecord(
      fileName, supplier, invoiceNumber, issueDate, clientName,
      locationName, electelCode, podCode, address,
      billingPeriod.startDate, billingPeriod.endDate,
      consumption.value, consumption.sourceLine, totalPayment,
      'kWh', totalPayment
    );

    return [record];
  }

  // Multi-location: use per-location totals (each location has its own "Total de plată/loc consum").
  // Single-location: fall back to invoice-level total.
  const multiLocation = electelCodes.length > 1;

  // Create a record for each ELECTEL code AND each consumption period
  const records: InvoiceRecord[] = [];

  for (const electelCode of electelCodes) {
    const electelSection = extractElectelSection(normalizedText, electelCode);
    const locationName = extractPPCLocationName(electelSection);
    const podCode = extractPPCPodCode(electelSection);
    const address = extractPPCAddress(electelSection);

    // Multi-location: prefer per-section total; fall back to invoice-level total if not found.
    // Single-location: always use invoice-level total.
    const locTotal = multiLocation
      ? extractPPCLocationTotal(electelSection)
      : totalPayment;

    // Primary: Acciză rows (via extractPPCConsumption) give reliable net kWh per location.
    // One record per location using the invoice billing period.
    const consumption = extractPPCConsumption(electelSection);
    records.push(createInvoiceRecord(
      fileName, supplier, invoiceNumber, issueDate, clientName,
      locationName, electelCode, podCode, address,
      billingPeriod.startDate, billingPeriod.endDate,
      consumption.value, consumption.sourceLine, locTotal,
      'kWh', totalPayment
    ));
  }

  return records;
}

/**
 * Parses NOVA POWER&GAS invoices
 * Multi-location invoice: page 1 = summary, pages 2+ = one location per page
 */
function parseNovaInvoice(text: string, fileName: string, supplier: string): InvoiceRecord[] {
  console.log('Using NOVA POWER&GAS parser');

  const invoiceNumber = extractNovaInvoiceNumber(text);
  const issueDate = extractNovaIssueDate(text);
  const clientName = extractNovaClientName(text);
  const totalPayment = extractNovaTotalPayment(text);
  const soldTotal = extractNovaSoldTotal(text);
  const billingPeriod = extractNovaBillingPeriod(text);

  console.log('NOVA common fields:', { invoiceNumber, issueDate, clientName, totalPayment, billingPeriod });

  const pages = text.split(/---\s*PAGE\s*BREAK\s*---/i);
  const records: InvoiceRecord[] = [];

  // Pages 2+ each contain one location
  for (let i = 1; i < pages.length; i++) {
    const page = pages[i];
    // Only process location pages: electricity/compensation has POD: or POD/CLC:, gas has "Adresă loc de consum"
    if (!/POD[/\s:]*RO/i.test(page) && !/Adres[aă]\s+loc\s+de\s+consum/i.test(page)) continue;

    const loc = extractNovaLocationFromPage(page);
    console.log(`NOVA page ${i + 1}:`, { pod: loc.pod, nlc: loc.nlcCode, consumption: loc.consumptionMwh });

    if (!loc.pod && !loc.nlcCode) continue;

    // PRO prosumer: standard electricity pattern doesn't match (line item uses "MWh -0,241000" order).
    // Look in full invoice text (annex page) for "Energie electrică consumată din rețea (MWh) [value] MWh".
    let consumptionMwh = loc.consumptionMwh;
    if ((isNaN(consumptionMwh) || consumptionMwh === 0) && invoiceNumber.startsWith('PRO-')) {
      const annexMatch = text.match(
        /Energie\s+electric[aă]\s+consumat[aă]\s+din\s+re[tț]ea\s*\(MWh\)\s*([\d,]+)\s*MWh/i
      );
      if (annexMatch) {
        const mwh = parseMwhDecimal(annexMatch[1]);
        if (!isNaN(mwh) && mwh !== 0) consumptionMwh = mwh;
      }
    }

    // All NOVA electricity stored as MWh (gas stays MWh too). consumptionKwh field holds the MWh value.
    const consumptionKwh = isNaN(consumptionMwh) ? 0 : parseFloat(consumptionMwh.toFixed(6));
    const startDate = loc.startDate || billingPeriod.startDate;
    const endDate = loc.endDate || billingPeriod.endDate;
    // Always use invoice-level total (VALOARE FACTURA CURENTA) for all locations.
    // Per-location totals are not shown as they inflate the apparent invoice value.
    const locTotal = totalPayment;

    const record = createInvoiceRecord(
      fileName, supplier, invoiceNumber, issueDate, clientName,
      loc.locationName, loc.nlcCode, loc.pod, loc.address,
      startDate, endDate, consumptionKwh, 'Energie activă', locTotal,
      'MWh', soldTotal
    );
    records.push(record);
  }

  // Fallback: if no location pages found, create single record
  if (records.length === 0) {
    const record = createInvoiceRecord(
      fileName, supplier, invoiceNumber, issueDate, clientName,
      '', '', '', '',
      billingPeriod.startDate, billingPeriod.endDate, 0, '', totalPayment,
      'kWh', soldTotal
    );
    records.push(record);
  }

  return records;
}

/**
 * Parses TINMAR ENERGY invoices
 * Pages 1–2 = invoice header, pages 3+ = annex with location sections per POD
 */
function parseTinmarInvoice(text: string, fileName: string, supplier: string): InvoiceRecord[] {
  console.log('Using TINMAR ENERGY parser');

  const invoiceNumber = extractTinmarInvoiceNumber(text);
  const issueDate = extractTinmarIssueDate(text);
  const clientName = extractTinmarClientName(text);
  const totalPayment = extractTinmarTotalPayment(text);
  const soldTotal = extractTinmarSoldTotal(text);
  const billingPeriod = extractTinmarBillingPeriod(text);

  console.log('TINMAR common fields:', { invoiceNumber, issueDate, clientName, totalPayment, billingPeriod });

  const locations = extractTinmarLocations(text);
  console.log('TINMAR locations found:', locations.length);

  const records: InvoiceRecord[] = [];

  for (const loc of locations) {
    // For single-location invoices (prosumer / TE25RP), per-loc total is 0; use invoice-level total
    const locTotal = loc.totalPayment !== 0 ? loc.totalPayment : (locations.length === 1 ? totalPayment : 0);
    console.log(`TINMAR location:`, { pod: loc.pod, consumption: loc.consumptionKwh, total: locTotal });

    // Use per-section dates when available; fall back to invoice-level period
    const startDate = loc.startDate || billingPeriod.startDate;
    const endDate = loc.endDate || billingPeriod.endDate;
    const record = createInvoiceRecord(
      fileName, supplier, invoiceNumber, issueDate, clientName,
      loc.locationName, loc.pod, loc.pod, loc.address,
      startDate, endDate,
      loc.consumptionKwh, 'Energie activă', locTotal,
      loc.consumptionUnit, soldTotal
    );
    records.push(record);
  }

  // Fallback: if no locations found, create single record
  if (records.length === 0) {
    const record = createInvoiceRecord(
      fileName, supplier, invoiceNumber, issueDate, clientName,
      '', '', '', '',
      billingPeriod.startDate, billingPeriod.endDate, 0, '', totalPayment,
      'kWh', soldTotal
    );
    records.push(record);
  }

  return records;
}

/**
 * Creates an InvoiceRecord with status determination
 */
function createInvoiceRecord(
  fileName: string,
  supplier: string,
  invoiceNumber: string,
  issueDate: string,
  clientName: string,
  locationName: string,
  nlcCode: string,
  podCode: string,
  address: string,
  startDate: string,
  endDate: string,
  consumptionKwh: number,
  sourceLine: string,
  totalPayment: number,
  consumptionUnit: 'kWh' | 'MWh' = 'kWh',
  soldTotal: number = 0
): InvoiceRecord {
  let status: 'OK' | 'INCOMPLETE' | 'ERROR' = 'OK';
  const missingFields: string[] = [];

  if (!invoiceNumber) missingFields.push('număr factură');
  if (!issueDate) missingFields.push('dată emisă');
  if (!nlcCode) missingFields.push('cod NLC/ELECTEL');
  if (!startDate || !endDate) missingFields.push('perioadă facturare');
  if (totalPayment === 0) missingFields.push('sumă de plată');

  if (missingFields.length > 0) {
    status = 'INCOMPLETE';
  }

  if (supplier === 'NECUNOSCUT') {
    status = 'ERROR';
    missingFields.unshift('furnizor necunoscut');
  }

  const observations = missingFields.length > 0
    ? `Date incomplete: ${missingFields.join(', ')}`
    : '';

  return {
    id: Math.random().toString(36).substring(7),
    fileName,
    supplier,
    invoiceNumber,
    issueDate,
    clientName,
    locationName,
    nlcCode,
    podCode,
    address,
    startDate,
    endDate,
    consumptionKwh,
    consumptionUnit,
    sourceLine: sourceLine || 'N/A',
    totalPayment,
    soldTotal,
    processingDate: new Date().toISOString().split('T')[0],
    documentLink: '',
    status,
    observations,
  };
}
