import { useState, useCallback, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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
      const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      setSelectedFiles(pdfFiles);
      if (pdfFiles.length > 0) {
        // Create a new FileList-like object with only PDF files
        const dataTransfer = new DataTransfer();
        pdfFiles.forEach(file => dataTransfer.items.add(file));
        onFilesSelected(dataTransfer.files);
      }
    }
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      setSelectedFiles(pdfFiles);
      if (pdfFiles.length > 0) {
        // Create a new FileList-like object with only PDF files
        const dataTransfer = new DataTransfer();
        pdfFiles.forEach(file => dataTransfer.items.add(file));
        onFilesSelected(dataTransfer.files);
      }
    }
    // Reset the input value so the same folder/files can be selected again
    e.target.value = '';
  }, [onFilesSelected]);

  const handleSelectFiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleSelectFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    folderInputRef.current?.click();
  };

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
        >
          {/* File input for selecting individual files */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          {/* Folder input for selecting entire folders */}
          <input
            ref={folderInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileInput}
            {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
          />
          
          <div className="flex flex-col items-center gap-4 text-center">
            {isProcessing ? (
              <>
                <div className="bg-primary/10 p-4 rounded-full">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Se procesează facturile...</p>
                  <p className="text-muted-foreground">Se extrag datele din fișierele PDF</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-primary/10 p-4 rounded-full">
                  <Upload className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Trageți facturile PDF aici sau faceți clic pentru a selecta
                  </p>
                  <p className="text-muted-foreground">
                    Suportă facturi de energie electrică de la Premier Energy, CEZ, E-Distribuție
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <Button variant="outline" className="gap-2" onClick={handleSelectFolder}>
                    <Folder className="h-4 w-4" />
                    Selectează Dosar
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleSelectFiles}>
                    <FileText className="h-4 w-4" />
                    Selectează Fișiere
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {selectedFiles.length > 0 && !isProcessing && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2">
              {selectedFiles.length} fișier{selectedFiles.length !== 1 ? 'e' : ''} PDF selectat{selectedFiles.length !== 1 ? 'e' : ''}:
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
                  +{selectedFiles.length - 5} mai mult{selectedFiles.length - 5 !== 1 ? 'e' : ''}
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
