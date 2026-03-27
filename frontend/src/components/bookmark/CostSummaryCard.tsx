import { useNavigate } from '@tanstack/react-router';
import { Bus, Utensils, BedDouble, ArrowRight, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCostDetail } from '@/hooks/cost/useCostDetail';
import type { LucideIcon } from 'lucide-react';

interface CostItemRowProps {
  icon: LucideIcon;
  label: string;
  price: string;
}

function CostItemRow({ icon: Icon, label, price }: CostItemRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-none">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-amber-50">
          <Icon className="size-3.5 text-amber-500" aria-hidden="true" />
        </span>
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-800">{price}</span>
    </div>
  );
}

function fmt(val: number | undefined): string {
  if (!val) return '-';
  return `₩${Math.round(val).toLocaleString()}`;
}

interface CostSummaryCardProps {
  cityId: number;
}

export function CostSummaryCard({ cityId }: CostSummaryCardProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useCostDetail('city', cityId);
  const lc = data?.living_cost;

  return (
    <Card className="gap-4">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-base text-slate-700">
          <Wallet className="size-4 text-amber-500" aria-hidden="true" />
          해외 물가
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3 py-1">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div>
            <CostItemRow icon={Bus} label="편도 대중교통" price={fmt(lc?.transportation?.local_transport_ticket)} />
            <CostItemRow icon={Utensils} label="점심 식사" price={fmt(lc?.eating_out?.lunch_menu)} />
            <CostItemRow icon={BedDouble} label="숙박 (일 평균)" price={fmt(lc?.without_rent ? lc.without_rent / 30 : undefined)} />
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full gap-1.5"
          onClick={() => void navigate({ to: '/cost/$countryId', params: { countryId: cityId } })}
          aria-label="해외 물가 상세 분석 페이지로 이동"
        >
          상세 분석하기
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
