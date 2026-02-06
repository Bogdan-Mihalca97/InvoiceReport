import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { InvoiceRecord, MonthlyAnalysis } from '@/types/invoice';

export const exportToExcel = async (
  invoices: InvoiceRecord[],
  analysis: MonthlyAnalysis[],
  clientName: string = 'Client'
) => {
  try {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Invoice Report';
  workbook.created = new Date();

  // ========== Sheet 1: Date Facturi ==========
  const wsInvoices = workbook.addWorksheet('Date Facturi', {
    views: [{ state: 'frozen', ySplit: 1 }], // Freeze top row
  });

  // Define columns with headers and formatting
  wsInvoices.columns = [
    { header: 'Nume Fișier', key: 'fileName', width: 30 },
    { header: 'Furnizor', key: 'supplier', width: 18 },
    { header: 'Nr Factură', key: 'invoiceNumber', width: 20 },
    { header: 'Data Emiterii', key: 'issueDate', width: 12 },
    { header: 'Nume Client', key: 'clientName', width: 30 },
    { header: 'Nume Locație', key: 'locationName', width: 25 },
    { header: 'Cod NLC', key: 'nlcCode', width: 12 },
    { header: 'Cod POD', key: 'podCode', width: 30 },
    { header: 'Adresă', key: 'address', width: 40 },
    { header: 'Data Start', key: 'startDate', width: 12 },
    { header: 'Data End', key: 'endDate', width: 12 },
    { header: 'Consum (kWh)', key: 'consumptionKwh', width: 14 },
    { header: 'Sursa Linie', key: 'sourceLine', width: 25 },
    { header: 'Total Plată (RON)', key: 'totalPayment', width: 18 },
    { header: 'Data Procesării', key: 'processingDate', width: 15 },
    { header: 'Link Document', key: 'documentLink', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Observații', key: 'observations', width: 40 },
  ];

  // Style header row - bold with green background
  const headerRow = wsInvoices.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }, // Light green
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Add data rows
  invoices.forEach((inv) => {
    // Build list of missing fields for observations
    const missingFields: string[] = [];
    if (!inv.supplier || inv.supplier === 'NECUNOSCUT') missingFields.push('Lipsă furnizor');
    if (!inv.invoiceNumber) missingFields.push('Lipsă nr factură');
    if (!inv.issueDate) missingFields.push('Lipsă dată emitere');
    if (!inv.clientName) missingFields.push('Lipsă nume client');
    if (!inv.locationName) missingFields.push('Lipsă nume locație');
    if (!inv.nlcCode) missingFields.push('Lipsă cod NLC');
    if (!inv.podCode) missingFields.push('Lipsă cod POD');
    if (!inv.address) missingFields.push('Lipsă adresă');
    if (!inv.startDate) missingFields.push('Lipsă dată start');
    if (!inv.endDate) missingFields.push('Lipsă dată end');
    if (inv.totalPayment === 0) missingFields.push('Lipsă sumă de plată');

    const observations = missingFields.length > 0
      ? missingFields.join('\r\n')
      : inv.observations || '';

    const row = wsInvoices.addRow({
      fileName: inv.fileName,
      supplier: inv.supplier,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      clientName: inv.clientName,
      locationName: inv.locationName,
      nlcCode: inv.nlcCode,
      podCode: inv.podCode,
      address: inv.address,
      startDate: inv.startDate,
      endDate: inv.endDate,
      consumptionKwh: inv.consumptionKwh,
      sourceLine: inv.sourceLine,
      totalPayment: inv.totalPayment,
      processingDate: inv.processingDate,
      documentLink: inv.documentLink || '',
      status: inv.status,
      observations: observations,
    });

    // Apply number formats to specific columns
    // kWh - number with 0 decimals
    row.getCell('consumptionKwh').numFmt = '#,##0';
    // RON - number with 2 decimals
    row.getCell('totalPayment').numFmt = '#,##0.00';

    // Wrap text for observations
    row.getCell('observations').alignment = { wrapText: true, vertical: 'top' };
  });

  // Add auto-filter to all columns (provides filtering without Excel Table)
  if (invoices.length > 0) {
    wsInvoices.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: invoices.length + 1, column: 18 },
    };
  }

  // ========== Sheet 2: Raport_Analiza ==========
  const wsAnalysis = workbook.addWorksheet('Raport_Analiza', {
    views: [{ state: 'frozen', ySplit: 1 }], // Freeze top row
  });

  // Get all unique months
  const allMonths = new Set<string>();
  analysis.forEach((item) => {
    Object.keys(item.monthlyData).forEach((month) => allMonths.add(month));
  });
  const sortedMonths = Array.from(allMonths).sort();

  // Define columns
  const analysisColumns: Partial<ExcelJS.Column>[] = [
    { header: 'Cod NLC', key: 'nlcCode', width: 12 },
    { header: 'Denumire Locație', key: 'locationName', width: 25 },
    ...sortedMonths.map((month) => ({ header: month, key: month, width: 12 })),
    { header: 'TOTAL AN', key: 'totalYear', width: 14 },
    { header: 'Medie Lunară', key: 'monthlyAverage', width: 14 },
  ];

  wsAnalysis.columns = analysisColumns;

  // Style header row
  const analysisHeaderRow = wsAnalysis.getRow(1);
  analysisHeaderRow.font = { bold: true };
  analysisHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' },
  };
  analysisHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Add data rows
  analysis.forEach((item) => {
    const rowData: Record<string, string | number> = {
      nlcCode: item.nlcCode,
      locationName: item.locationName,
    };

    sortedMonths.forEach((month) => {
      rowData[month] = item.monthlyData[month] || 0;
    });

    rowData['totalYear'] = item.totalYear;
    rowData['monthlyAverage'] = item.monthlyAverage;

    const row = wsAnalysis.addRow(rowData);

    // Format number columns
    sortedMonths.forEach((month) => {
      row.getCell(month).numFmt = '#,##0';
    });
    row.getCell('totalYear').numFmt = '#,##0';
    row.getCell('monthlyAverage').numFmt = '#,##0';
  });

  // Add auto-filter
  const totalColumns = 2 + sortedMonths.length + 2; // NLC + Location + months + Total + Average
  wsAnalysis.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: analysis.length + 1, column: totalColumns },
  };

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const fileName = `Raport_Facturi_${clientName.replace(/\s+/g, '_')}_${date}.xlsx`;

  // Write to buffer and download
  console.log('Writing Excel buffer...');
  const buffer = await workbook.xlsx.writeBuffer();
  console.log('Buffer created, size:', buffer.byteLength);

  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  console.log('Blob created, saving as:', fileName);
  saveAs(blob, fileName);

  return fileName;
  } catch (error) {
    console.error('Excel export error:', error);
    throw error;
  }
};
