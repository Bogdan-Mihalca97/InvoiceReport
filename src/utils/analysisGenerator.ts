import { InvoiceRecord, MonthlyAnalysis, ProcessingSummary } from '@/types/invoice';

/**
 * Generates monthly analysis from invoice records
 */
export function generateMonthlyAnalysis(invoices: InvoiceRecord[]): MonthlyAnalysis[] {
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
}

/**
 * Generates processing summary from invoice records
 */
export function generateProcessingSummary(invoices: InvoiceRecord[]): ProcessingSummary {
  return {
    totalFiles: invoices.length,
    successfulFiles: invoices.filter((inv) => inv.status === 'OK').length,
    incompleteFiles: invoices.filter((inv) => inv.status === 'INCOMPLETE').length,
    errorFiles: invoices.filter((inv) => inv.status === 'ERROR').length,
    processingDate: new Date().toISOString().split('T')[0],
  };
}
