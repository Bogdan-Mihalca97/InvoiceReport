import { useState, useCallback } from 'react';
import { Download, FileSpreadsheet, BarChart3, Table2, Eye, EyeOff } from 'lucide-react';
import Header from '@/components/Header';
import FileUploadZone from '@/components/FileUploadZone';
import ProcessingSummaryCard from '@/components/ProcessingSummaryCard';
import InvoiceDataTable from '@/components/InvoiceDataTable';
import MonthlyAnalysisTable from '@/components/MonthlyAnalysisTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel } from '@/utils/excelExport';
import { importFromExcel, dedupKey } from '@/utils/excelImport';
import { InvoiceRecord, MonthlyAnalysis, ProcessingSummary } from '@/types/invoice';
import { extractTextFromPDF } from '@/utils/pdfExtractor';
import { parseInvoiceText } from '@/utils/invoiceParser';
import { generateMonthlyAnalysis, generateProcessingSummary } from '@/utils/analysisGenerator';

const Index = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [claudeApiKey, setClaudeApiKey] = useState(() => localStorage.getItem('claude_api_key') ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
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
    const fileArray = Array.from(files).filter(f => f.type === 'application/pdf');
    let completed = 0;
    let succeeded = 0;
    let failed = 0;
    setProgress({ current: 0, total: fileArray.length });

    // Streams records into the table as each file finishes.
    // dedupKey = invoiceNumber|POD/NLC, so the same NLC across different invoices
    // (different invoice numbers) is kept — only exact re-uploads are skipped.
    const addRecords = (newRecords: InvoiceRecord[]) => {
      setInvoices(prev => {
        const existingKeys = new Set(prev.map(dedupKey));
        const toAdd = newRecords.filter(r => !existingKeys.has(dedupKey(r)));
        if (toAdd.length === 0) return prev;
        const merged = [...prev, ...toAdd];
        setAnalysis(generateMonthlyAnalysis(merged));
        setSummary(generateProcessingSummary(merged));
        setHasData(true);
        return merged;
      });
    };

    // Sequential processing: PDF.js uses a shared worker — concurrent document
    // loads interfere and cause "Invalid page request" errors.
    for (const file of fileArray) {
      try {
        const text = await extractTextFromPDF(file, claudeApiKey || undefined);
        const records = parseInvoiceText(text, file.name);
        addRecords(records);
        succeeded++;
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        addRecords([{
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
          consumptionUnit: 'kWh' as const,
          sourceLine: '',
          totalPayment: 0,
          soldTotal: 0,
          processingDate: new Date().toISOString().split('T')[0],
          documentLink: '',
          status: 'ERROR',
          observations: `Eroare la procesare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`,
        }]);
        failed++;
      } finally {
        setProgress(p => ({ ...p, current: ++completed }));
      }
    }

    setIsProcessing(false);
    toast({
      title: 'Procesare Finalizată',
      description: `${succeeded} fișiere procesate cu succes${failed ? `, ${failed} cu erori` : ''}.`,
    });
  }, [toast, claudeApiKey]);

  const handleImportExcel = useCallback(async (file: File) => {
    if (!file) return;
    try {
      const imported = await importFromExcel(file);
      setInvoices(prev => {
        const existingKeys = new Set(prev.map(dedupKey));
        const newRecords = imported.filter(r => !existingKeys.has(dedupKey(r)));
        const merged = [...prev, ...newRecords];
        setAnalysis(generateMonthlyAnalysis(merged));
        setSummary(generateProcessingSummary(merged));
        setHasData(true);
        return merged;
      });
      toast({ title: 'Import Reușit', description: `${imported.length} înregistrări importate din Excel.` });
    } catch (error) {
      toast({ title: 'Import Eșuat', description: error instanceof Error ? error.message : 'Eroare necunoscută.', variant: 'destructive' });
    }
  }, [toast]);

  const handleUpdateInvoice = useCallback((id: string, consumptionKwh: number) => {
    setInvoices(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, consumptionKwh } : r);
      setAnalysis(generateMonthlyAnalysis(updated));
      setSummary(generateProcessingSummary(updated));
      return updated;
    });
  }, []);

  const handleDeleteInvoice = useCallback((id: string) => {
    setInvoices(prev => {
      const updated = prev.filter(r => r.id !== id);
      setAnalysis(generateMonthlyAnalysis(updated));
      setSummary(generateProcessingSummary(updated));
      if (updated.length === 0) setHasData(false);
      return updated;
    });
  }, []);

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
        {/* Claude API Key (optional — enables Claude Vision OCR for scanned PDFs) */}
        <section>
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="Claude API key (opțional — OCR mai rapid pentru PDF scanate)"
                value={claudeApiKey}
                onChange={e => {
                  setClaudeApiKey(e.target.value);
                  if (e.target.value) localStorage.setItem('claude_api_key', e.target.value);
                  else localStorage.removeItem('claude_api_key');
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showApiKey ? 'Ascunde cheia' : 'Afișează cheia'}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section>
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            isProcessing={isProcessing}
            onImportExcel={handleImportExcel}
          />
          {isProcessing && progress.total > 0 && (
            <p className="mt-3 text-sm text-muted-foreground text-center">
              Se procesează fișierul {progress.current} din {progress.total}…
            </p>
          )}
        </section>

        {/* Results Section */}
        {hasData && (
          <>
            {/* Processing Summary */}
            <section>
              <ProcessingSummaryCard summary={summary} />
            </section>

            {/* Export Button */}
            <section className="flex justify-end gap-2">
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
                  <InvoiceDataTable invoices={invoices} onUpdate={handleUpdateInvoice} onDelete={handleDeleteInvoice} />
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
