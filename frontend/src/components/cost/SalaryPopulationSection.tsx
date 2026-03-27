import { DollarSign, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LivingCost } from '@/schemas/cost.schema';

interface SalaryPopulationSectionProps {
  livingCost: LivingCost | undefined;
  isLoading: boolean;
}

export function SalaryPopulationSection({
  livingCost,
  isLoading,
}: SalaryPopulationSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (!livingCost) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center gap-3 px-5 py-4 bg-card border border-border rounded-xl shadow-sm">
        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
          <DollarSign className="size-5 text-blue-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">세후 평균 월급</p>
          <p className="text-lg font-black text-foreground">
            ₩{livingCost.monthly_salary_after_tax.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-4 bg-card border border-border rounded-xl shadow-sm">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
          <Users className="size-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">인구</p>
          <p className="text-lg font-black text-foreground">
            {(livingCost.population / 10000).toFixed(0)}만 명
          </p>
        </div>
      </div>
    </div>
  );
}
