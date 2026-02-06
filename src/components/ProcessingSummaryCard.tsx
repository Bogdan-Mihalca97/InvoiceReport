import { FileCheck, AlertCircle, XCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProcessingSummary } from '@/types/invoice';

interface ProcessingSummaryCardProps {
  summary: ProcessingSummary;
}

const ProcessingSummaryCard = ({ summary }: ProcessingSummaryCardProps) => {
  const stats = [
    {
      label: 'Total Fișiere',
      value: summary.totalFiles,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Reușite',
      value: summary.successfulFiles,
      icon: FileCheck,
      color: 'text-status-ok',
      bgColor: 'bg-status-ok/10',
    },
    {
      label: 'Incomplete',
      value: summary.incompleteFiles,
      icon: AlertCircle,
      color: 'text-status-incomplete',
      bgColor: 'bg-status-incomplete/10',
    },
    {
      label: 'Erori',
      value: summary.errorFiles,
      icon: XCircle,
      color: 'text-status-error',
      bgColor: 'bg-status-error/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
      {stats.map((stat) => (
        <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`${stat.bgColor} p-3 rounded-lg`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProcessingSummaryCard;
