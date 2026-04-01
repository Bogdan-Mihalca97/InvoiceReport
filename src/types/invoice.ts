// Invoice data types matching the specification

export interface InvoiceRecord {
  id: string;
  fileName: string;
  supplier: string;
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  locationName: string;
  nlcCode: string;
  podCode: string;
  address: string;
  startDate: string;
  endDate: string;
  consumptionKwh: number;
  consumptionUnit: 'kWh' | 'MWh';
  sourceLine: string;
  totalPayment: number;
  soldTotal: number;
  processingDate: string;
  documentLink: string;
  status: 'OK' | 'INCOMPLETE' | 'ERROR';
  observations: string;
}

export interface MonthlyAnalysis {
  nlcCode: string;
  locationName: string;
  consumptionUnit: 'kWh' | 'MWh';
  monthlyData: Record<string, number>;
  totalYear: number;
  monthlyAverage: number;
}

export interface ProcessingSummary {
  totalFiles: number;
  successfulFiles: number;
  incompleteFiles: number;
  errorFiles: number;
  processingDate: string;
}
