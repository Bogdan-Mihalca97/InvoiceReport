import * as XLSX from 'xlsx';
import { InvoiceRecord, MonthlyAnalysis } from '@/types/invoice';

export const exportToExcel = (
  invoices: InvoiceRecord[],
  analysis: MonthlyAnalysis[],
  clientName: string = 'Client'
) => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // ========== Sheet 1: Date Facturi ==========
  const invoiceData = invoices.map((inv) => ({
    'Nume Fișier': inv.fileName,
    'Furnizor': inv.supplier,
    'Nr Factură': inv.invoiceNumber,
    'Data Emiterii': inv.issueDate,
    'Nume Client': inv.clientName,
    'Nume Locație': inv.locationName,
    'Cod NLC': inv.nlcCode,
    'Cod POD': inv.podCode,
    'Adresă': inv.address,
    'Data Start': inv.startDate,
    'Data End': inv.endDate,
    'Consum (kWh)': inv.consumptionKwh,
    'Sursa Linie': inv.sourceLine,
    'Total Plată (RON)': inv.totalPayment,
    'Data Procesării': inv.processingDate,
    'Link Document': inv.documentLink,
    'Status': inv.status,
    'Observații': inv.observations,
  }));

  const wsInvoices = XLSX.utils.json_to_sheet(invoiceData);
  
  // Set column widths
  wsInvoices['!cols'] = [
    { wch: 30 }, // Nume Fișier
    { wch: 18 }, // Furnizor
    { wch: 20 }, // Nr Factură
    { wch: 12 }, // Data Emiterii
    { wch: 30 }, // Nume Client
    { wch: 25 }, // Nume Locație
    { wch: 12 }, // Cod NLC
    { wch: 30 }, // Cod POD
    { wch: 40 }, // Adresă
    { wch: 12 }, // Data Start
    { wch: 12 }, // Data End
    { wch: 12 }, // Consum (kWh)
    { wch: 25 }, // Sursa Linie
    { wch: 15 }, // Total Plată
    { wch: 15 }, // Data Procesării
    { wch: 30 }, // Link Document
    { wch: 12 }, // Status
    { wch: 40 }, // Observații
  ];

  XLSX.utils.book_append_sheet(wb, wsInvoices, 'Date Facturi');

  // ========== Sheet 2: Raport_Analiza ==========
  // Get all unique months
  const allMonths = new Set<string>();
  analysis.forEach((item) => {
    Object.keys(item.monthlyData).forEach((month) => allMonths.add(month));
  });
  const sortedMonths = Array.from(allMonths).sort();

  const analysisData = analysis.map((item) => {
    const row: Record<string, string | number> = {
      'Cod NLC': item.nlcCode,
      'Denumire Locație': item.locationName,
    };

    sortedMonths.forEach((month) => {
      row[month] = item.monthlyData[month] || 0;
    });

    row['TOTAL AN'] = item.totalYear;
    row['Medie Lunară'] = item.monthlyAverage;

    return row;
  });

  const wsAnalysis = XLSX.utils.json_to_sheet(analysisData);

  // Set column widths for analysis sheet
  const analysisCols = [
    { wch: 12 }, // Cod NLC
    { wch: 25 }, // Denumire Locație
    ...sortedMonths.map(() => ({ wch: 10 })), // Month columns
    { wch: 12 }, // TOTAL AN
    { wch: 12 }, // Medie Lunară
  ];
  wsAnalysis['!cols'] = analysisCols;

  XLSX.utils.book_append_sheet(wb, wsAnalysis, 'Raport_Analiza');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const fileName = `Raport_Facturi_${clientName.replace(/\s+/g, '_')}_${date}.xlsx`;

  // Download the file
  XLSX.writeFile(wb, fileName);

  return fileName;
};
