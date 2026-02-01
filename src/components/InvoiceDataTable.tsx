import { useState } from 'react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
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
}

type SortKey = keyof InvoiceRecord;

const InvoiceDataTable = ({ invoices }: InvoiceDataTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('issueDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      inv.nlcCode.toLowerCase().includes(term)
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
                placeholder="Search invoices..."
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
                <SortHeader label="File Name" sortKeyName="fileName" />
                <SortHeader label="Supplier" sortKeyName="supplier" />
                <SortHeader label="Invoice No." sortKeyName="invoiceNumber" />
                <SortHeader label="Issue Date" sortKeyName="issueDate" />
                <SortHeader label="Client" sortKeyName="clientName" />
                <SortHeader label="Location" sortKeyName="locationName" />
                <SortHeader label="NLC Code" sortKeyName="nlcCode" />
                <SortHeader label="Period" sortKeyName="startDate" />
                <SortHeader label="kWh" sortKeyName="consumptionKwh" />
                <SortHeader label="Total (RON)" sortKeyName="totalPayment" />
                <SortHeader label="Status" sortKeyName="status" />
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
                  <TableCell className="font-mono text-sm">{invoice.nlcCode || '-'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {invoice.startDate && invoice.endDate 
                      ? `${invoice.startDate} → ${invoice.endDate}` 
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {invoice.consumptionKwh > 0 ? formatNumber(invoice.consumptionKwh) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {invoice.totalPayment > 0 ? formatCurrency(invoice.totalPayment) : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                </TableRow>
              ))}
              {sortedInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No invoices found matching your search.
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
