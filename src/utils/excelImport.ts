import ExcelJS from 'exceljs';
import { InvoiceRecord } from '@/types/invoice';

/**
 * Parse an exported Excel file back into InvoiceRecord[].
 * Expects a sheet named "Date Facturi" with the same column layout produced by excelExport.ts.
 */
export async function importFromExcel(file: File): Promise<InvoiceRecord[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheet = workbook.getWorksheet('Date Facturi');
  if (!sheet) throw new Error('Nu s-a găsit foaia "Date Facturi" în fișierul Excel.');

  const records: InvoiceRecord[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    // ExcelJS row.values is 1-indexed; index 0 is undefined
    const v = row.values as any[];

    const raw = (i: number) => v[i];
    const str = (i: number) => String(raw(i) ?? '').trim();
    const num = (i: number) => {
      const val = raw(i);
      if (typeof val === 'number') return val;
      return parseFloat(String(val ?? '0').replace(/\s/g, '').replace(',', '.')) || 0;
    };

    // Column 12: stored as "173 kWh" or "0.173 MWh"
    const consumptionStr = str(12);
    const consumptionMatch = consumptionStr.match(/^(-?[\d.,]+)\s*(kWh|MWh)$/i);
    const consumptionKwh = consumptionMatch
      ? parseFloat(consumptionMatch[1].replace(',', '.'))
      : 0;
    const consumptionUnit = (consumptionMatch?.[2]?.toLowerCase() === 'mwh' ? 'MWh' : 'kWh') as 'kWh' | 'MWh';

    const statusRaw = str(18);
    const status = (['OK', 'INCOMPLETE', 'ERROR'].includes(statusRaw) ? statusRaw : 'INCOMPLETE') as InvoiceRecord['status'];

    // Skip completely empty rows
    const invoiceNumber = str(3);
    if (!invoiceNumber && !str(1) && !str(2)) return;

    records.push({
      id: Math.random().toString(36).substring(7),
      fileName: str(1),
      supplier: str(2),
      invoiceNumber,
      issueDate: str(4),
      clientName: str(5),
      locationName: str(6),
      nlcCode: str(7),
      podCode: str(8),
      address: str(9),
      startDate: str(10),
      endDate: str(11),
      consumptionKwh,
      consumptionUnit,
      sourceLine: str(13),
      totalPayment: num(14),
      soldTotal: num(15),
      processingDate: str(16),
      documentLink: str(17),
      status,
      observations: str(19),
    });
  });

  return records;
}

/** Build a deduplication key for an invoice record.
 *  Always includes fileName so records from different files never collide,
 *  even when invoiceNumber / nlcCode are missing (e.g. extraction failed).
 *  Re-uploading the exact same file+invoice+location is still deduped. */
export function dedupKey(r: InvoiceRecord): string {
  return `${r.fileName}|${r.invoiceNumber}|${r.nlcCode || r.podCode || r.locationName}`;
}
