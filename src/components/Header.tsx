import { Zap, FileSpreadsheet } from 'lucide-react';

const Header = () => {
  return (
    <header className="gradient-energy text-primary-foreground py-6 px-6 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary-foreground/20 p-2 rounded-lg">
            <Zap className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invoice Data Extractor</h1>
            <p className="text-sm opacity-90">Electricity Invoice Processing & Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-lg">
          <FileSpreadsheet className="h-5 w-5" />
          <span className="text-sm font-medium">Excel Export Ready</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
