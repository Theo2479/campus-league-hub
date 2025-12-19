import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const StatCard = ({ label, value, icon, trend, className }: StatCardProps) => {
  return (
    <Card variant="elevated" className={cn('animate-fade-in', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>
          </div>
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10 text-gold">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
