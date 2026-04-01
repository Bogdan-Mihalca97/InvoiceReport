import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MonthlyAnalysis } from '@/types/invoice';

interface MonthlyAnalysisTableProps {
  analysis: MonthlyAnalysis[];
}

const MonthlyAnalysisTable = ({ analysis }: MonthlyAnalysisTableProps) => {
  // Get all unique months across all NLCs
  const allMonths = new Set<string>();
  analysis.forEach((item) => {
    Object.keys(item.monthlyData).forEach((month) => allMonths.add(month));
  });
  const sortedMonths = Array.from(allMonths).sort();

  const formatNumber = (num: number, unit: 'kWh' | 'MWh' = 'kWh') => {
    if (unit === 'MWh') {
      return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 3, maximumFractionDigits: 6 }).format(num);
    }
    return new Intl.NumberFormat('ro-RO').format(Math.round(num));
  };


  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    return `${year}-${parseInt(m)}`;
  };

  return (
    <Card className="shadow-card animate-slide-up">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-xl font-semibold text-foreground">
          Raport Analiză - Consum Lunar pe NLC
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="sticky left-0 bg-muted/30 z-10 font-semibold">
                  Cod NLC
                </TableHead>
                <TableHead className="sticky left-[100px] bg-muted/30 z-10 font-semibold">
                  Locație
                </TableHead>
                <TableHead className="text-center font-semibold whitespace-nowrap">
                  UM
                </TableHead>
                {sortedMonths.map((month) => (
                  <TableHead key={month} className="text-center whitespace-nowrap">
                    {formatMonth(month)}
                  </TableHead>
                ))}
                <TableHead className="text-center font-semibold bg-primary/5">
                  TOTAL AN
                </TableHead>
                <TableHead className="text-center font-semibold bg-accent/5">
                  Media Lunară
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.map((item) => (
                <TableRow key={item.nlcCode} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="sticky left-0 bg-card z-10 font-mono text-sm font-medium">
                    {item.nlcCode}
                  </TableCell>
                  <TableCell
                    className="sticky left-[100px] bg-card z-10 max-w-[200px] truncate"
                    title={item.locationName}
                  >
                    {item.locationName}
                  </TableCell>
                  <TableCell className="text-center text-xs font-medium text-muted-foreground">
                    {item.consumptionUnit}
                  </TableCell>
                  {sortedMonths.map((month) => {
                    const value = item.monthlyData[month];
                    return (
                      <TableCell
                        key={month}
                        className={`text-center tabular-nums${value !== undefined && value < 0 ? ' text-destructive' : ''}`}
                      >
                        {value !== undefined ? formatNumber(value, item.consumptionUnit) : '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className={`text-center font-bold tabular-nums bg-primary/5${item.totalYear < 0 ? ' text-destructive' : ''}`}>
                    {formatNumber(item.totalYear, item.consumptionUnit)}
                  </TableCell>
                  <TableCell className={`text-center font-semibold tabular-nums bg-accent/5${item.monthlyAverage < 0 ? ' text-destructive' : ''}`}>
                    {formatNumber(item.monthlyAverage, item.consumptionUnit)}
                  </TableCell>
                </TableRow>
              ))}
              {analysis.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={sortedMonths.length + 5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nu sunt date de analiză disponibile. Procesați facturi pentru a genera raportul.
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

export default MonthlyAnalysisTable;
