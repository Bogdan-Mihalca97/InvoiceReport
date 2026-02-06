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
    { pattern: /Total[\s]+loc[\s]+de[\s]+consum[\s:]*(-?[0-9,.]+)[\s]*kWh/i, label: 'Total loc de consum' },
    { pattern: /Total[\s]+energie[\s]+activ[aă][\s:]*(-?[0-9,.]+)[\s]*kWh/i, label: 'Total energie activă' },
    { pattern: /energie[\s]+activ[aă][\s:]*(-?[0-9,.]+)[\s]*kWh/i, label: 'Energie activă' },
    { pattern: /Cantitate[\s]+facturată[\s:]*(-?[0-9,.]+)[\s]*kWh/i, label: 'Cantitate facturată' },
    { pattern: /(?:consum|cantitate)[\s:]*(-?[0-9,.]+)[\s]*(?:kWh|kwh)/i, label: 'Consum' },
  ];

  for (const { pattern, label } of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseRomanianNumber(match[1]);
      if (!isNaN(num) && Math.abs(num) < 10000000) {
        return { value: Math.round(num), sourceLine: label };
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
 * Extracts the text section relevant to a specific NLC code (ELECTRICA)
 */
function extractNlcSection(text: string, nlcCode: string, skipFirstPage: boolean = false): string {
  const pages = text.split(/---\s*PAGE\s*BREAK\s*---/i);
  const startIndex = skipFirstPage ? 1 : 0;

  for (let i = startIndex; i < pages.length; i++) {
    if (pages[i].includes(nlcCode)) {
      return pages[i];
    }
  }

  const nlcIndex = text.indexOf(nlcCode);
  if (nlcIndex === -1) {
    return text;
  }

  const detailsPattern = /DETALII\s+LOC\s+DE\s+CONSUM/gi;
  const matches = [...text.matchAll(detailsPattern)];

  for (let i = 0; i < matches.length; i++) {
    const matchStart = matches[i].index!;
    const matchEnd = i < matches.length - 1 ? matches[i + 1].index! : text.length;
    const section = text.substring(matchStart, matchEnd);

    if (section.includes(nlcCode)) {
      return section;
    }
  }

  const start = Math.max(0, nlcIndex - 500);
  const end = Math.min(text.length, nlcIndex + 2500);
  return text.substring(start, end);
}

// ============================================================
// PPC-SPECIFIC EXTRACTION FUNCTIONS
// ============================================================

/**
 * Extracts invoice number for PPC invoices
 * Format: "seria 25EI nr 06295537" or "Anexa la factura seria 25EI nr 06295537"
 */
function extractPPCInvoiceNumber(text: string): string {
  const patterns = [
    /seria[\s]+([A-Z0-9]+)[\s]+nr[\s]+([0-9]+)/i,
    /factura[\s]+seria[\s]+([A-Z0-9]+)[\s]+nr[\s]+([0-9]+)/i,
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

  // Pattern 1: Location name right before "Adresă loc consum" (with possible newline or space)
  // Matches: "CAMIN\nAdresă loc consum:" or "BLOC SPECIALISTI\nAdresă loc consum:"
  const beforeAddressMatch = text.match(/^([A-Z][A-Z0-9\s\.\-]{2,60}?)(?:-\d+[\/\d\.]*)?[\s\r\n]+Adres[aă]\s+loc\s+consum/im);
  if (beforeAddressMatch) {
    let name = beforeAddressMatch[1].trim();
    name = name.replace(/-\d+.*$/, '').trim();
    console.log('Found location before address:', name);
    if (name.length >= 3 && !name.includes('ELECTEL') && !name.includes('POD') && !/^Cod\s/i.test(name)) {
      return name;
    }
  }

  // Pattern 2: First uppercase word/phrase at start of text (location header)
  // Must be followed by newline and "Adresă" somewhere
  const firstLineMatch = text.match(/^([A-Z][A-Z0-9\s\.\-]{2,60}?)[\r\n]/m);
  if (firstLineMatch) {
    let name = firstLineMatch[1].trim();
    name = name.replace(/-\d+.*$/, '').trim();
    console.log('Found location from first line:', name);
    // Exclude common non-location patterns
    if (name.length >= 3 &&
        !name.includes('ELECTEL') &&
        !name.includes('POD') &&
        !/^Adres/i.test(name) &&
        !/^Cod\s/i.test(name) &&
        !/^Nivel/i.test(name) &&
        !/^Oferta/i.test(name) &&
        !/^Pagina/i.test(name) &&
        !/^Interval/i.test(name) &&
        !/^Specificat/i.test(name)) {
      return name;
    }
  }

  // Pattern 3: Location with reference number (e.g., "CENTRU DE INFORMARE TURISTICA-137689441/16.09.2014")
  const locationWithRefMatch = text.match(/^([A-Z][A-Z0-9\s]{3,60})-\d+/m);
  if (locationWithRefMatch) {
    const name = locationWithRefMatch[1].trim();
    console.log('Found location name with ref:', name);
    if (name.length >= 3 && !name.includes('ELECTEL') && !name.includes('POD') && !/^Adres/i.test(name)) {
      return name;
    }
  }

  // Pattern 4: Look for location as standalone line before "Cod ELECTEL"
  const beforeElectelMatch = text.match(/^([A-Z][A-Z0-9\s\.\-]{2,60}?)[\s\r\n]+(?:Adres|Cod\s+ELECTEL)/im);
  if (beforeElectelMatch) {
    let name = beforeElectelMatch[1].trim();
    name = name.replace(/-\d+.*$/, '').trim();
    console.log('Found location before ELECTEL:', name);
    if (name.length >= 3 && !name.includes('ELECTEL') && !name.includes('POD')) {
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

      // Clean up - remove cod poștal at end
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
 * Extracts ALL consumption periods from PPC invoices
 * Each ELECTEL can have multiple billing periods with different kWh values
 * Format: "Energie activă 17.10.24-16.01.25 kWh ... 0" and "Energie activă 17.01.25-31.01.25 kWh ... 48"
 */
interface ConsumptionPeriod {
  startDate: string;
  endDate: string;
  kWh: number;
  sourceLine: string;
}

function extractPPCConsumptionPeriods(text: string): ConsumptionPeriod[] {
  const periods: ConsumptionPeriod[] = [];

  // We want the MAIN consumption table rows, NOT the detailed "cf. OUG" breakdown
  // Main table format varies but generally:
  // "Energie activă DD.MM.YY-DD.MM.YY kWh CONST INDEX_VECHI INDEX_NOU CANTITATE_MASURATA ..."
  // Where INDEX contains "/" (like "26222/cit" or "26222/estimat convenie")
  // CANTITATE_MASURATA is the number we want (0, 48, 28, etc.)

  // Find all "Energie activă" rows with date ranges (main table rows only, not OUG breakdown)
  const rowPattern = /Energie\s+activ\s*[aă]\s+(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s+kWh\s+(\d+)([^\n]*)/gi;

  const matches = text.matchAll(rowPattern);
  for (const match of matches) {
    // Check if this is a detailed breakdown row (has "OUG" or "cf." nearby)
    const contextBefore = text.substring(Math.max(0, match.index! - 80), match.index!);

    // Skip if this is a detailed "cf. OUG" row (these have "OUG", "cf.", or row numbers like "1.", "2.")
    if (/OUG|cf\.|^\s*\d+\.\s+Energie/i.test(contextBefore)) {
      continue;
    }

    const startDay = match[1].padStart(2, '0');
    const startMonth = match[2].padStart(2, '0');
    let startYear = match[3];
    if (startYear.length === 2) startYear = '20' + startYear;

    const endDay = match[4].padStart(2, '0');
    const endMonth = match[5].padStart(2, '0');
    let endYear = match[6];
    if (endYear.length === 2) endYear = '20' + endYear;

    const constValue = match[7]; // This is the CONST column, not what we want
    const restOfRow = match[8] || ''; // Everything after "kWh CONST"

    console.log(`Row for ${startDay}.${startMonth}.${startYear}: const=${constValue}, rest="${restOfRow.substring(0, 80)}"`);

    // Parse the rest of the row to find Cantitate măsurată
    // Format: INDEX_VECHI(with/) INDEX_NOU(may or may not have /) CANTITATE CORECȚII ...
    // After the "/" entries, find the first standalone number

    // Extract all numbers from the rest of the row
    const numbers = restOfRow.match(/\d+/g) || [];
    let kWh = 0;

    // Look for pattern: after text containing "/", the next number is likely Cantitate
    // Split by "/" to find where index readings end
    const partsAfterSlash = restOfRow.split('/');
    if (partsAfterSlash.length >= 2) {
      // After the last "/" and its associated text, find the first number
      const lastPart = partsAfterSlash[partsAfterSlash.length - 1];
      // Skip the first word (which is part of the index like "cit" or "estimat") and find the number
      const afterIndexMatch = lastPart.match(/(?:cit|citit|estimat|convenie|autocitit)[^\d]*(\d+)/i);
      if (afterIndexMatch) {
        kWh = parseInt(afterIndexMatch[1]);
      } else {
        // Try to find the first standalone number after index text
        const numbersInLastPart = lastPart.match(/\d+/g);
        if (numbersInLastPart && numbersInLastPart.length > 0) {
          // The first number after index text is likely Cantitate
          kWh = parseInt(numbersInLastPart[0]);
        }
      }
    } else if (numbers.length > 0) {
      // Fallback: if no "/" found, the rest of the row might just have numbers
      // Take the first number as a fallback
      kWh = parseInt(numbers[0]);
    }

    console.log(`  -> Extracted kWh: ${kWh}`);

    // Check if we already have this period (avoid duplicates)
    const exists = periods.some(p =>
      p.startDate === `${startYear}-${startMonth}-${startDay}` &&
      p.endDate === `${endYear}-${endMonth}-${endDay}`
    );

    if (!exists) {
      periods.push({
        startDate: `${startYear}-${startMonth}-${startDay}`,
        endDate: `${endYear}-${endMonth}-${endDay}`,
        kWh: kWh,
        sourceLine: 'Energie activă',
      });
    }
  }

  console.log('Found main consumption periods:', periods);
  return periods;
}

/**
 * Extracts single consumption for PPC invoices (fallback)
 * Used when no specific periods are found
 */
function extractPPCConsumption(text: string): { value: number; sourceLine: string } {
  // Try to find total consumption
  const patterns = [
    /Consum[\s]+energie[\s]+activ[aă][^\n]*?(\d+)/i,
    /Total[\s]+energie[\s\S]*?(-?[0-9.,]+)[\s]*kWh/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseRomanianNumber(match[1]);
      if (!isNaN(num) && Math.abs(num) < 10000000) {
        return { value: Math.round(num), sourceLine: 'Consum energie activă' };
      }
    }
  }

  return { value: 0, sourceLine: '' };
}

/**
 * Extracts total payment for PPC invoices
 * Format: "Total de plată (6=4+5) ... 30.075,79 lei"
 */
function extractPPCTotalPayment(text: string): number {
  const patterns = [
    /Total[\s]+de[\s]+plat[aă][\s\S]*?(-?[0-9.,]+)(?:\s*lei)?/i,
    /Total[\s]+de[\s]+plat[aă][\s]+\([^)]+\)[\s\S]*?(-?[0-9]+[.,][0-9]{2})/i,
    /6\.[\s]*Total[\s]+de[\s]+plat[aă][\s\S]*?(-?[0-9]+[.,][0-9]{2})/i,
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
 * Extracts billing period for PPC invoices
 * Format: "Perioadă facturare: 16.10.2024-31.01.2025"
 */
function extractPPCBillingPeriod(text: string): { startDate: string; endDate: string } {
  const patterns = [
    /Perioad[aă][\s]+facturare[\s:]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})[\s]*[\-–][\s]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i,
    /Perioad[aă][\s]+de[\s]+facturare[\s:]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})[\s]*[\-–][\s]*([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/i,
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
 * Extracts the text section for a specific ELECTEL code (PPC)
 * Each ELECTEL has its own page with location header at the top
 */
function extractElectelSection(text: string, electelCode: string): string {
  const pages = text.split(/---\s*PAGE\s*BREAK\s*---/i);

  // Find the page containing this ELECTEL code
  for (const page of pages) {
    if (page.includes(electelCode)) {
      console.log(`Found ELECTEL ${electelCode} on page, length: ${page.length}`);
      // Return the whole page - it should contain the location header at the top
      return page.trim();
    }
  }

  // If not found in pages, try to find section by looking for location headers
  // PPC format: Each location starts with uppercase name followed by "Adresă loc consum"
  const locationPattern = /^([A-Z][A-Z0-9\s\.\-]+)[\r\n]+Adres[aă]\s+loc\s+consum/gim;
  const locationMatches = [...text.matchAll(locationPattern)];

  for (let i = 0; i < locationMatches.length; i++) {
    const sectionStart = locationMatches[i].index!;
    const sectionEnd = i < locationMatches.length - 1 ? locationMatches[i + 1].index! : text.length;
    const section = text.substring(sectionStart, sectionEnd);

    if (section.includes(electelCode)) {
      console.log(`Found ELECTEL ${electelCode} in location section starting at ${sectionStart}`);
      return section.trim();
    }
  }

  // Try finding by "Cod ELECTEL" pattern
  const electelPattern = /Cod[\s]+ELECTEL/gi;
  const electelMatches = [...text.matchAll(electelPattern)];

  for (let i = 0; i < electelMatches.length; i++) {
    const matchStart = electelMatches[i].index!;
    // Include 500 chars before to capture location header
    const sectionStart = Math.max(0, matchStart - 500);
    const sectionEnd = i < electelMatches.length - 1 ? electelMatches[i + 1].index! : text.length;
    const section = text.substring(sectionStart, sectionEnd);

    if (section.includes(electelCode)) {
      console.log(`Found ELECTEL ${electelCode} near Cod ELECTEL pattern`);
      return section.trim();
    }
  }

  // Fallback: extract around the code with generous context
  const codeIndex = text.indexOf(electelCode);
  if (codeIndex === -1) {
    return text;
  }

  const start = Math.max(0, codeIndex - 800);
  const end = Math.min(text.length, codeIndex + 3000);
  console.log(`Using fallback extraction for ELECTEL ${electelCode}`);
  return text.substring(start, end).trim();
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
  const allNlcCodes = extractAllNlcCodes(text);
  const shouldSkipFirstPage = allNlcCodes.length > 1;
  const textForExtraction = shouldSkipFirstPage && pages.length > 1
    ? pages.slice(1).join('\n\n--- PAGE BREAK ---\n\n')
    : text;
  const nlcCodes = shouldSkipFirstPage
    ? extractAllNlcCodes(textForExtraction)
    : allNlcCodes;

  console.log('Extracted common fields:', {
    supplier,
    invoiceNumber,
    issueDate,
    clientName,
    totalPayment,
    billingPeriod,
    nlcCodesFound: nlcCodes.length,
  });

  // If no NLC codes found, create a single record
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
  const skipFirstPage = nlcCodes.length > 1;

  for (const nlcCode of nlcCodes) {
    const nlcSection = extractNlcSection(text, nlcCode, skipFirstPage);
    const locationName = extractElectricaLocationName(nlcSection);
    const podCode = extractElectricaPodCode(nlcSection);
    const address = extractElectricaAddress(nlcSection);
    const consumption = extractElectricaConsumption(nlcSection);

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

  // Extract common fields from first page
  const invoiceNumber = extractPPCInvoiceNumber(text);
  const issueDate = extractPPCIssueDate(text);
  const clientName = extractPPCClientName(text) || extractClientName(text);
  const totalPayment = extractPPCTotalPayment(text);
  const billingPeriod = extractPPCBillingPeriod(text);

  // Find all ELECTEL codes
  const electelCodes = extractAllElectelCodes(text);

  console.log('Extracted common fields:', {
    supplier,
    invoiceNumber,
    issueDate,
    clientName,
    totalPayment,
    billingPeriod,
    electelCodesFound: electelCodes.length,
  });

  // If no ELECTEL codes found, create a single record
  if (electelCodes.length === 0) {
    const locationName = extractPPCLocationName(text);
    const electelCode = extractElectelCode(text);
    const podCode = extractPPCPodCode(text);
    const address = extractPPCAddress(text);
    const consumption = extractPPCConsumption(text);

    const record = createInvoiceRecord(
      fileName, supplier, invoiceNumber, issueDate, clientName,
      locationName, electelCode, podCode, address,
      billingPeriod.startDate, billingPeriod.endDate,
      consumption.value, consumption.sourceLine, totalPayment
    );

    return [record];
  }

  // Create a record for each ELECTEL code AND each consumption period
  const records: InvoiceRecord[] = [];

  for (const electelCode of electelCodes) {
    const electelSection = extractElectelSection(text, electelCode);
    const locationName = extractPPCLocationName(electelSection);
    const podCode = extractPPCPodCode(electelSection);
    const address = extractPPCAddress(electelSection);

    // Extract all consumption periods for this ELECTEL
    const consumptionPeriods = extractPPCConsumptionPeriods(electelSection);

    console.log(`ELECTEL ${electelCode}:`, {
      locationName,
      podCode,
      address: address.substring(0, 50),
      periodsFound: consumptionPeriods.length,
    });

    if (consumptionPeriods.length > 0) {
      // Create one record per consumption period
      for (const period of consumptionPeriods) {
        const record = createInvoiceRecord(
          fileName, supplier, invoiceNumber, issueDate, clientName,
          locationName, electelCode, podCode, address,
          period.startDate, period.endDate,
          period.kWh, period.sourceLine, totalPayment
        );
        records.push(record);
      }
    } else {
      // Fallback: create single record with overall billing period
      const consumption = extractPPCConsumption(electelSection);
      const record = createInvoiceRecord(
        fileName, supplier, invoiceNumber, issueDate, clientName,
        locationName, electelCode, podCode, address,
        billingPeriod.startDate, billingPeriod.endDate,
        consumption.value, consumption.sourceLine, totalPayment
      );
      records.push(record);
    }
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
  totalPayment: number
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
    sourceLine: sourceLine || 'N/A',
    totalPayment,
    processingDate: new Date().toISOString().split('T')[0],
    documentLink: '',
    status,
    observations,
  };
}
