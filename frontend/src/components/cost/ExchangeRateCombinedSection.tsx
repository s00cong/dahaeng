import { TrendingUp, TrendingDown, RefreshCw, Lightbulb, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useExchangeRateHistory } from '@/hooks/cost/useExchangeRateHistory';
import { CostCard } from './CostCard';
import type { ExchangeRateNew } from '@/schemas/cost.schema';

dayjs.locale('ko');

interface ExchangeRateCombinedSectionProps {
  currency: string;
  exchangeRateData: ExchangeRateNew | undefined;
  isLoading: boolean;
}

type PeriodType = 'D' | 'W' | 'M';

const PERIOD_LABELS: Record<PeriodType, string> = {
  M: '월별',
  W: '주별',
  D: '일별',
};

const DATE_FORMATS: Record<PeriodType, string> = {
  D: 'MM/DD',
  W: 'MM/DD',
  M: 'YY/MM',
};

export function ExchangeRateCombinedSection({
  currency,
  exchangeRateData,
  isLoading,
}: ExchangeRateCombinedSectionProps) {
  const [type, setType] = useState<PeriodType>('M');
  
  // 차트용 데이터 (현재 선택된 타입: 월/주/일)
  const { data: historyData, isLoading: isHistoryLoading } = useExchangeRateHistory(currency, type);
  
  // 기준점 계산용 데이터 (사용자 요청에 따라 '주별(W)' 고정 사용)
  const { data: weeklyData } = useExchangeRateHistory(currency, 'W');

  // Current rate logic (API 명세: krw_per_1target 직접 사용)
  const krwPerTarget = exchangeRateData?.krw_per_1target ?? null;
  const eventDateFormatted = exchangeRateData ? dayjs(exchangeRateData.event_date).format('MM월 DD일') : '';

  // 주별 평균 및 변동률 계산 (API 명세: history 배열 및 krwPer1target 필드)
  const weeklyAvg =
    weeklyData && weeklyData.history.length > 0
      ? weeklyData.history.reduce((sum, t) => sum + t.krwPer1target, 0) / weeklyData.history.length
      : null;

  const latestRate = exchangeRateData ? exchangeRateData.krw_per_1target : (historyData?.latest.krwPer1target ?? null);
  
  // 퍼센트 계산: ((현재 - 평균) / 평균) * 100
  const diffPercent = (weeklyAvg && latestRate) 
    ? ((latestRate - weeklyAvg) / weeklyAvg) * 100 
    : null;

  // History logic (Chart)
  const chartData = historyData?.history.map((item) => ({
    date: dayjs(item.date).format(DATE_FORMATS[type]),
    rate: item.krwPer1target,
  }));

  const currentChartAvg =
    historyData && historyData.history.length > 0
      ? historyData.history.reduce((sum, t) => sum + t.krwPer1target, 0) / historyData.history.length
      : null;

  const isFavorable = currentChartAvg !== null && latestRate !== null && latestRate < currentChartAvg;

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      {/* Left Column (Ratio 4) */}
      <CostCard className="md:w-2/5" contentClassName="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              현재 환율
            </span>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ) : exchangeRateData && krwPerTarget !== null ? (
            <div>
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 gap-1 px-1.5 py-0.5 mb-3 leading-tight">
                <RefreshCw className="size-2.5" />
                실시간 환율 기준 · {eventDateFormatted}
              </Badge>
              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-bold text-foreground tracking-tight">
                  {Math.round(krwPerTarget).toLocaleString()}
                </span>
                <span className="text-base text-muted-foreground mb-1">KRW</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                1 {exchangeRateData.target} = {krwPerTarget.toLocaleString()} KRW
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">데이터 없음</p>
          )}
        </div>

        <div className="mt-4">
          <RateTrendStatus 
            diffPercent={diffPercent} 
            latestRate={latestRate} 
            avgRate={weeklyAvg} 
          />
        </div>
      </CostCard>

      {/* Right Column (Ratio 6) */}
      <CostCard className="md:w-3/5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-foreground">
            환율 추이
            {historyData?.latest.displaySymbol ? ` (${historyData.latest.displaySymbol})` : ''}
          </span>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
                  type === t
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {PERIOD_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {isHistoryLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : chartData && chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{ fontSize: 13, borderRadius: 8 }}
                  formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(2)} KRW`, '환율']}
                />
                {currentChartAvg !== null && (
                  <ReferenceLine
                    y={currentChartAvg}
                    stroke="#94a3b8"
                    strokeDasharray="4 2"
                    label={{ value: '평균', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div
              className={cn(
                'flex items-start gap-2.5 mt-4 rounded-lg px-4 py-3 text-sm transition-colors',
                isFavorable
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
              )}
            >
              {isFavorable ? (
                <Lightbulb className="size-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              )}
              <span className="font-medium">
                {isFavorable
                  ? '현재 환율이 기간 평균보다 유리합니다. 지금이 여행 적기일 수 있어요!'
                  : '현재 환율이 기간 평균보다 불리합니다. 환율 추이를 좀 더 지켜보세요.'}
              </span>
            </div>
          </>
        ) : (
          <div className="h-40 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">환율 데이터를 불러올 수 없습니다</p>
          </div>
        )}
      </CostCard>
    </div>
  );
}

function RateTrendStatus({ 
  diffPercent, 
  latestRate, 
  avgRate 
}: { 
  diffPercent: number | null, 
  latestRate: number | null, 
  avgRate: number | null 
}) {
  if (diffPercent === null || latestRate === null || avgRate === null) return null;

  const isStrong = latestRate > avgRate;
  const absPercent = Math.abs(diffPercent).toFixed(2);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-3 rounded-lg border transition-all relative overflow-hidden',
        isStrong 
          ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400' 
          : 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400',
      )}
    >
      {!isStrong && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold animate-pulse">
          추천
        </div>
      )}
      
      <div className="flex items-center gap-2">
        {isStrong ? (
          <TrendingUp className="size-4" />
        ) : (
          <TrendingDown className="size-4" />
        )}
        <span className="text-sm font-bold">
          주별 평균 대비 {isStrong ? '강세' : '약세'}
        </span>
      </div>
      
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] font-medium opacity-90">
          평균보다 <span className="underline decoration-2 underline-offset-2">{absPercent}%</span> {isStrong ? '높음' : '낮음'}
        </p>
        {!isStrong && (
          <p className="text-[12px] font-bold mt-1 text-blue-700 dark:text-blue-300">
            지금이 여행 적기예요! ✨
          </p>
        )}
      </div>
    </div>
  );
}
