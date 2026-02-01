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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ro-RO').format(num);
  };

  // Calculate max value for heatmap coloring
  const maxValue = Math.max(
    ...analysis.flatMap((item) => Object.values(item.monthlyData))
  );

  const getHeatmapColor = (value: number) => {
    if (value === 0) return '';
    const intensity = value / maxValue;
    if (intensity > 0.75) return 'bg-energy-teal/30 text-foreground font-semibold';
    if (intensity > 0.5) return 'bg-energy-teal/20 text-foreground';
    if (intensity > 0.25) return 'bg-energy-teal/10 text-foreground';
    return 'bg-energy-teal/5 text-foreground';
  };

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    return `${year}-${parseInt(m)}`;
  };

  return (
    <Card className="shadow-card animate-slide-up">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-xl font-semibold text-foreground">
          Raport Analiză - Monthly Consumption by NLC (kWh)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="sticky left-0 bg-muted/30 z-10 font-semibold">
                  NLC Code
                </TableHead>
                <TableHead className="sticky left-[100px] bg-muted/30 z-10 font-semibold">
                  Location
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
                  {sortedMonths.map((month) => {
                    const value = item.monthlyData[month] || 0;
                    return (
                      <TableCell 
                        key={month} 
                        className={`text-center tabular-nums ${getHeatmapColor(value)}`}
                      >
                        {value > 0 ? formatNumber(value) : '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold tabular-nums bg-primary/5">
                    {formatNumber(item.totalYear)}
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums bg-accent/5">
                    {formatNumber(item.monthlyAverage)}
                  </TableCell>
                </TableRow>
              ))}
              {analysis.length === 0 && (
                <TableRow>
                  <TableCell 
                    colSpan={sortedMonths.length + 4} 
                    className="text-center py-8 text-muted-foreground"
                  >
                    No analysis data available. Process invoices to generate the report.
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
