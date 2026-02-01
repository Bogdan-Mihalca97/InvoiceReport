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
import {
  mockInvoices,
  mockMonthlyAnalysis,
  mockProcessingSummary,
} from '@/data/mockInvoices';
import { exportToExcel } from '@/utils/excelExport';
import { InvoiceRecord, MonthlyAnalysis, ProcessingSummary } from '@/types/invoice';

const Index = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasData, setHasData] = useState(true); // Start with mock data for demo
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(mockInvoices);
  const [analysis, setAnalysis] = useState<MonthlyAnalysis[]>(mockMonthlyAnalysis);
  const [summary, setSummary] = useState<ProcessingSummary>(mockProcessingSummary);

  const handleFilesSelected = useCallback((files: FileList) => {
    setIsProcessing(true);
    
    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setHasData(true);
      // In a real app, this would process the PDFs and update state
      toast({
        title: 'Processing Complete',
        description: `Successfully processed ${files.length} invoice(s). Demo data is displayed.`,
      });
    }, 2000);
  }, [toast]);

  const handleExport = useCallback(() => {
    try {
      const fileName = exportToExcel(invoices, analysis, 'SC_EXEMPLU_INDUSTRIES');
      toast({
        title: 'Export Successful',
        description: `Downloaded ${fileName}`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'An error occurred while exporting the data.',
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
                Export to Excel
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
                No Invoice Data Yet
              </h2>
              <p className="text-muted-foreground">
                Upload PDF invoices to extract data and generate reports.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Invoice Data Extractor • Electricity Invoice Processing & Analysis</p>
          <p className="mt-1">Supports Premier Energy, CEZ, E-Distribuție and more</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
