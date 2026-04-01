import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Filter, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InvoiceRecord } from '@/types/invoice';

interface InvoiceDataTableProps {
  invoices: InvoiceRecord[];
  onUpdate?: (id: string, consumptionKwh: number) => void;
  onDelete?: (id: string) => void;
}

type SortKey = keyof InvoiceRecord;

const InvoiceDataTable = ({ invoices, onUpdate, onDelete }: InvoiceDataTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('issueDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    return (
      inv.fileName.toLowerCase().includes(term) ||
      inv.supplier.toLowerCase().includes(term) ||
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.clientName.toLowerCase().includes(term) ||
      inv.locationName.toLowerCase().includes(term) ||
      inv.address.toLowerCase().includes(term) ||
      inv.nlcCode.toLowerCase().includes(term) ||
      inv.podCode.toLowerCase().includes(term)
    );
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    
    const aStr = String(aVal || '');
    const bStr = String(bVal || '');
    return sortAsc ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  const startEdit = (invoice: InvoiceRecord) => {
    setEditingId(invoice.id);
    setEditValue(String(invoice.consumptionKwh ?? 0));
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const commitEdit = (invoice: InvoiceRecord) => {
    const parsed = parseFloat(editValue.replace(',', '.'));
    if (!isNaN(parsed) && parsed !== invoice.consumptionKwh) {
      onUpdate?.(invoice.id, parsed);
    }
    setEditingId(null);
  };

  const StatusBadge = ({ status }: { status: InvoiceRecord['status'] }) => {
    const variants = {
      OK: 'bg-status-ok/10 text-status-ok border-status-ok/20',
      INCOMPLETE: 'bg-status-incomplete/10 text-status-incomplete border-status-incomplete/20',
      ERROR: 'bg-status-error/10 text-status-error border-status-error/20',
    };

    return (
      <Badge variant="outline" className={`${variants[status]} font-medium`}>
        {status}
      </Badge>
    );
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors whitespace-nowrap"
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (
          sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ro-RO').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(num);
  };

  return (
    <Card className="shadow-card animate-slide-up">
      <CardHeader className="border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-semibold text-foreground">
            Date Facturi
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută facturi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <SortHeader label="Nume Fișier" sortKeyName="fileName" />
                <SortHeader label="Furnizor" sortKeyName="supplier" />
                <SortHeader label="Nr. Factură" sortKeyName="invoiceNumber" />
                <SortHeader label="Data Emisă" sortKeyName="issueDate" />
                <SortHeader label="Client" sortKeyName="clientName" />
                <SortHeader label="Locație" sortKeyName="locationName" />
                <SortHeader label="Adresa" sortKeyName="address" />
                <SortHeader label="Cod NLC" sortKeyName="nlcCode" />
                <SortHeader label="Cod POD" sortKeyName="podCode" />
                <SortHeader label="Perioada de facturare" sortKeyName="startDate" />
                <SortHeader label="Consum" sortKeyName="consumptionKwh" />
                <SortHeader label="Total (RON)" sortKeyName="totalPayment" />
                <SortHeader label="Sold (RON)" sortKeyName="soldTotal" />
                <SortHeader label="Status" sortKeyName="status" />
                {onDelete && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => (
                <TableRow 
                  key={invoice.id} 
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-mono text-xs max-w-[200px] truncate" title={invoice.fileName}>
                    {invoice.fileName}
                  </TableCell>
                  <TableCell className="font-medium">{invoice.supplier}</TableCell>
                  <TableCell className="font-mono text-sm">{invoice.invoiceNumber || '-'}</TableCell>
                  <TableCell>{invoice.issueDate || '-'}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={invoice.clientName}>
                    {invoice.clientName || '-'}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={invoice.locationName}>
                    {invoice.locationName || '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={invoice.address}>
                    {invoice.address || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{invoice.nlcCode || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{invoice.podCode || '-'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {invoice.startDate && invoice.endDate
                      ? `${invoice.startDate} → ${invoice.endDate}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {editingId === invoice.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          ref={editInputRef}
                          type="number"
                          step="any"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(invoice)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(invoice);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-24 rounded border border-input bg-background px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <span className="text-xs text-muted-foreground">{invoice.consumptionUnit ?? 'kWh'}</span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 justify-end group cursor-pointer"
                        onClick={() => onUpdate && startEdit(invoice)}
                        title={onUpdate ? 'Click pentru a edita consumul' : undefined}
                      >
                        <span className={invoice.consumptionKwh === 0 ? 'text-destructive' : ''}>
                          {invoice.consumptionKwh !== null && invoice.consumptionKwh !== undefined
                            ? `${formatNumber(invoice.consumptionKwh)} ${invoice.consumptionUnit ?? 'kWh'}`
                            : '-'}
                        </span>
                        {onUpdate && (
                          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {invoice.totalPayment !== null && invoice.totalPayment !== undefined
                      ? formatCurrency(invoice.totalPayment)
                      : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums${invoice.soldTotal > 0 ? ' text-destructive' : ''}`}>
                    {invoice.soldTotal ? formatCurrency(invoice.soldTotal) : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  {onDelete && (
                    <TableCell>
                      <button
                        onClick={() => onDelete(invoice.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Șterge rândul"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {sortedInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={onDelete ? 15 : 14} className="text-center py-8 text-muted-foreground">
                    Nu s-au găsit facturi care să corespundă căutării.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceDataTable;
