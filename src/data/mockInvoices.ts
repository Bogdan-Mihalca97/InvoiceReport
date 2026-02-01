import { InvoiceRecord, MonthlyAnalysis, ProcessingSummary } from '@/types/invoice';

// Mock invoice data for demonstration
export const mockInvoices: InvoiceRecord[] = [
  {
    id: '1',
    fileName: 'factura_premier_01_2024.pdf',
    supplier: 'PREMIER ENERGY',
    invoiceNumber: 'PE-2024-001234',
    issueDate: '2024-01-15',
    clientName: 'SC EXEMPLU INDUSTRIES SRL',
    locationName: 'Sediu Central București',
    nlcCode: 'NLC-001',
    podCode: 'RO001E400000000000000001',
    address: 'Str. Industriilor nr. 45, Sector 2, București',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    consumptionKwh: 12450,
    sourceLine: 'Energie electrică activă',
    totalPayment: 8234.50,
    processingDate: '2024-02-01',
    documentLink: '',
    status: 'OK',
    observations: '',
  },
  {
    id: '2',
    fileName: 'factura_cez_01_2024.pdf',
    supplier: 'CEZ VÂNZARE',
    invoiceNumber: 'CEZ-2024-005678',
    issueDate: '2024-01-18',
    clientName: 'SC EXEMPLU INDUSTRIES SRL',
    locationName: 'Depozit Ploiești',
    nlcCode: 'NLC-002',
    podCode: 'RO001E400000000000000002',
    address: 'Str. Depozitelor nr. 12, Ploiești, Prahova',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    consumptionKwh: 8320,
    sourceLine: 'Total energie activă',
    totalPayment: 5512.80,
    processingDate: '2024-02-01',
    documentLink: '',
    status: 'OK',
    observations: '',
  },
  {
    id: '3',
    fileName: 'factura_premier_02_2024.pdf',
    supplier: 'PREMIER ENERGY',
    invoiceNumber: 'PE-2024-002345',
    issueDate: '2024-02-14',
    clientName: 'SC EXEMPLU INDUSTRIES SRL',
    locationName: 'Sediu Central București',
    nlcCode: 'NLC-001',
    podCode: 'RO001E400000000000000001',
    address: 'Str. Industriilor nr. 45, Sector 2, București',
    startDate: '2024-02-01',
    endDate: '2024-02-29',
    consumptionKwh: 11280,
    sourceLine: 'Energie electrică activă',
    totalPayment: 7456.80,
    processingDate: '2024-03-01',
    documentLink: '',
    status: 'OK',
    observations: '',
  },
  {
    id: '4',
    fileName: 'factura_cez_02_2024.pdf',
    supplier: 'CEZ VÂNZARE',
    invoiceNumber: 'CEZ-2024-006789',
    issueDate: '2024-02-16',
    clientName: 'SC EXEMPLU INDUSTRIES SRL',
    locationName: 'Depozit Ploiești',
    nlcCode: 'NLC-002',
    podCode: 'RO001E400000000000000002',
    address: 'Str. Depozitelor nr. 12, Ploiești, Prahova',
    startDate: '2024-02-01',
    endDate: '2024-02-29',
    consumptionKwh: 7890,
    sourceLine: 'Total energie activă',
    totalPayment: 5228.70,
    processingDate: '2024-03-01',
    documentLink: '',
    status: 'OK',
    observations: '',
  },
  {
    id: '5',
    fileName: 'factura_premier_03_2024.pdf',
    supplier: 'PREMIER ENERGY',
    invoiceNumber: 'PE-2024-003456',
    issueDate: '2024-03-15',
    clientName: 'SC EXEMPLU INDUSTRIES SRL',
    locationName: 'Sediu Central București',
    nlcCode: 'NLC-001',
    podCode: 'RO001E400000000000000001',
    address: 'Str. Industriilor nr. 45, Sector 2, București',
    startDate: '2024-03-01',
    endDate: '2024-03-31',
    consumptionKwh: 13120,
    sourceLine: 'Energie electrică activă',
    totalPayment: 8677.20,
    processingDate: '2024-04-01',
    documentLink: '',
    status: 'OK',
    observations: '',
  },
  {
    id: '6',
    fileName: 'factura_edistributie_03_2024.pdf',
    supplier: 'E-DISTRIBUȚIE',
    invoiceNumber: 'ED-2024-009876',
    issueDate: '2024-03-20',
    clientName: 'SC EXEMPLU INDUSTRIES SRL',
    locationName: 'Fabrică Timișoara',
    nlcCode: 'NLC-003',
    podCode: 'RO001E400000000000000003',
    address: 'Bd. Industriilor nr. 78, Timișoara, Timiș',
    startDate: '2024-03-01',
    endDate: '2024-03-31',
    consumptionKwh: 0,
    sourceLine: '',
    totalPayment: 0,
    processingDate: '2024-04-01',
    documentLink: '',
    status: 'INCOMPLETE',
    observations: 'Nu s-a găsit secțiunea de consum - OCR slab',
  },
  {
    id: '7',
    fileName: 'factura_corupta.pdf',
    supplier: 'NECUNOSCUT',
    invoiceNumber: '',
    issueDate: '',
    clientName: '',
    locationName: '',
    nlcCode: '',
    podCode: '',
    address: '',
    startDate: '',
    endDate: '',
    consumptionKwh: 0,
    sourceLine: '',
    totalPayment: 0,
    processingDate: '2024-04-01',
    documentLink: '',
    status: 'ERROR',
    observations: 'Fișier PDF corupt - nu poate fi citit',
  },
];

// Generate monthly analysis from invoices
export const generateMonthlyAnalysis = (invoices: InvoiceRecord[]): MonthlyAnalysis[] => {
  const nlcMap = new Map<string, { locationName: string; monthlyData: Record<string, number> }>();

  invoices
    .filter((inv) => inv.status === 'OK' && inv.endDate)
    .forEach((invoice) => {
      const month = invoice.endDate.substring(0, 7); // YYYY-MM
      
      if (!nlcMap.has(invoice.nlcCode)) {
        nlcMap.set(invoice.nlcCode, {
          locationName: invoice.locationName,
          monthlyData: {},
        });
      }
      
      const entry = nlcMap.get(invoice.nlcCode)!;
      entry.monthlyData[month] = (entry.monthlyData[month] || 0) + invoice.consumptionKwh;
    });

  return Array.from(nlcMap.entries()).map(([nlcCode, data]) => {
    const values = Object.values(data.monthlyData);
    const totalYear = values.reduce((sum, val) => sum + val, 0);
    const monthlyAverage = values.length > 0 ? Math.round(totalYear / values.length) : 0;

    return {
      nlcCode,
      locationName: data.locationName,
      monthlyData: data.monthlyData,
      totalYear,
      monthlyAverage,
    };
  });
};

export const mockMonthlyAnalysis = generateMonthlyAnalysis(mockInvoices);

export const mockProcessingSummary: ProcessingSummary = {
  totalFiles: mockInvoices.length,
  successfulFiles: mockInvoices.filter((inv) => inv.status === 'OK').length,
  incompleteFiles: mockInvoices.filter((inv) => inv.status === 'INCOMPLETE').length,
  errorFiles: mockInvoices.filter((inv) => inv.status === 'ERROR').length,
  processingDate: new Date().toISOString().split('T')[0],
};
