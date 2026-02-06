import { useState, useCallback } from 'react';
import { Download, FileSpreadsheet, BarChart3, Table2 } from 'lucide-react';
import Header from '@/components/Header';
import FileUploadZone from '@/components/FileUploadZone';
import ProcessingSummaryCard from '@/components/ProcessingSummaryCard';
import InvoiceDataTable from '@/components/InvoiceDataTable';
import MonthlyAnalysisTable from '@/components/MonthlyAnalysisTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel } from '@/utils/excelExport';
import { InvoiceRecord, MonthlyAnalysis, ProcessingSummary } from '@/types/invoice';
import { extractTextFromPDF } from '@/utils/pdfExtractor';
import { parseInvoiceText } from '@/utils/invoiceParser';
import { generateMonthlyAnalysis, generateProcessingSummary } from '@/utils/analysisGenerator';

const Index = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [analysis, setAnalysis] = useState<MonthlyAnalysis[]>([]);
  const [summary, setSummary] = useState<ProcessingSummary>({
    totalFiles: 0,
    successfulFiles: 0,
    incompleteFiles: 0,
    errorFiles: 0,
    processingDate: new Date().toISOString().split('T')[0],
  });

  const handleFilesSelected = useCallback(async (files: FileList) => {
    setIsProcessing(true);

    try {
      const processedInvoices: InvoiceRecord[] = [];
      const fileArray = Array.from(files);

      // Process each PDF file
      for (const file of fileArray) {
        if (file.type === 'application/pdf') {
          try {
            // Extract text from PDF
            const text = await extractTextFromPDF(file);

            // Parse the text to extract invoice data (returns array of records, one per NLC)
            const invoiceRecords = parseInvoiceText(text, file.name);
            processedInvoices.push(...invoiceRecords);
          } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            // Add error record for failed file
            processedInvoices.push({
              id: Math.random().toString(36).substring(7),
              fileName: file.name,
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
              processingDate: new Date().toISOString().split('T')[0],
              documentLink: '',
              status: 'ERROR',
              observations: `Eroare la procesare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`,
            });
          }
        }
      }

      // Generate analysis and summary
      const monthlyAnalysis = generateMonthlyAnalysis(processedInvoices);
      const processingSummary = generateProcessingSummary(processedInvoices);

      // Update state
      setInvoices(processedInvoices);
      setAnalysis(monthlyAnalysis);
      setSummary(processingSummary);
      setHasData(true);
      setIsProcessing(false);

      // Show success notification
      toast({
        title: 'Procesare Finalizată',
        description: `Au fost procesate ${processingSummary.successfulFiles} din ${processingSummary.totalFiles} fișiere cu succes.`,
      });
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: 'Eroare la Procesare',
        description: 'A apărut o eroare la procesarea facturilor.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleExport = useCallback(async () => {
    try {
      const fileName = await exportToExcel(invoices, analysis, 'SC_EXEMPLU_INDUSTRIES');
      toast({
        title: 'Export Reușit',
        description: `Descărcat ${fileName}`,
      });
    } catch (error) {
      toast({
        title: 'Export Eșuat',
        description: 'A apărut o eroare la exportarea datelor.',
        variant: 'destructive',
      });
    }
  }, [invoices, analysis, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Upload Section */}
        <section>
          <FileUploadZone 
            onFilesSelected={handleFilesSelected} 
            isProcessing={isProcessing} 
          />
        </section>

        {/* Results Section */}
        {hasData && (
          <>
            {/* Processing Summary */}
            <section>
              <ProcessingSummaryCard summary={summary} />
            </section>

            {/* Export Button */}
            <section className="flex justify-end">
              <Button
                onClick={handleExport}
                className="gap-2 shadow-md hover:shadow-lg transition-shadow"
                size="lg"
              >
                <Download className="h-5 w-5" />
                Exportă în Excel
                <FileSpreadsheet className="h-5 w-5" />
              </Button>
            </section>

            {/* Data Tables */}
            <section>
              <Tabs defaultValue="invoices" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                  <TabsTrigger value="invoices" className="gap-2">
                    <Table2 className="h-4 w-4" />
                    Date Facturi
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Raport Analiză
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="invoices" className="animate-fade-in">
                  <InvoiceDataTable invoices={invoices} />
                </TabsContent>
                
                <TabsContent value="analysis" className="animate-fade-in">
                  <MonthlyAnalysisTable analysis={analysis} />
                </TabsContent>
              </Tabs>
            </section>
          </>
        )}

        {/* Empty State */}
        {!hasData && !isProcessing && (
          <section className="text-center py-16">
            <div className="bg-muted/50 rounded-2xl p-12 max-w-2xl mx-auto">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Încă Nu Există Date Facturi
              </h2>
              <p className="text-muted-foreground">
                Încărcați facturi PDF pentru a extrage date și genera rapoarte.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Extractor Date Facturi • Procesare și Analiză Facturi Energie Electrică</p>
          <p className="mt-1">Suportă Premier Energy, CEZ, E-Distribuție și altele</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
