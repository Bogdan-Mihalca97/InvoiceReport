import { useState, useCallback } from 'react';
import { Upload, Folder, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  isProcessing: boolean;
}

const FileUploadZone = ({ onFilesSelected, isProcessing }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
      setSelectedFiles(pdfFiles);
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
      setSelectedFiles(pdfFiles);
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  return (
    <Card className="shadow-card animate-slide-up">
      <CardContent className="p-6">
        <div
          className={`
            border-2 border-dashed rounded-xl p-10 transition-all duration-300 cursor-pointer
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-[1.01]' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          
          <div className="flex flex-col items-center gap-4 text-center">
            {isProcessing ? (
              <>
                <div className="bg-primary/10 p-4 rounded-full">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Processing invoices...</p>
                  <p className="text-muted-foreground">Extracting data from PDF files</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-primary/10 p-4 rounded-full">
                  <Upload className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Drop PDF invoices here or click to browse
                  </p>
                  <p className="text-muted-foreground">
                    Supports electricity invoices from Premier Energy, CEZ, E-Distribuție
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <Button variant="outline" className="gap-2">
                    <Folder className="h-4 w-4" />
                    Select Folder
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Select Files
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {selectedFiles.length > 0 && !isProcessing && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2">
              {selectedFiles.length} PDF file{selectedFiles.length !== 1 ? 's' : ''} selected:
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.slice(0, 5).map((file, idx) => (
                <span 
                  key={idx} 
                  className="text-xs bg-card px-3 py-1 rounded-full border border-border text-muted-foreground"
                >
                  {file.name}
                </span>
              ))}
              {selectedFiles.length > 5 && (
                <span className="text-xs text-muted-foreground px-2 py-1">
                  +{selectedFiles.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUploadZone;
