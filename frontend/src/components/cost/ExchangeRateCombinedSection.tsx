import { RefreshCw, Lightbulb, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { useState, useEffect } from 'react';
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
  exchangeRateData: ExchangeRateNew | null | undefined;
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

  // 사용자 입력 금액 (기본값: displayUnit, 없으면 1)
  const [inputAmount, setInputAmount] = useState<number>(exchangeRateData?.display_unit ?? 1);

  // 통화가 바뀌면 기본값 재설정
  useEffect(() => {
    setInputAmount(exchangeRateData?.display_unit ?? 1);
  }, [currency, exchangeRateData?.display_unit]);

  // 차트용 데이터 (현재 선택된 타입: 월/주/일)
  const { data: historyData, isLoading: isHistoryLoading } = useExchangeRateHistory(currency, type);

  // 사용자가 입력한 금액 기준 KRW 계산
  const krwPer1 = exchangeRateData?.krw_per_1target ?? null;
  const displayedKrw = krwPer1 !== null ? Math.round(inputAmount * krwPer1) : null;
  const eventDateFormatted = exchangeRateData ? dayjs(exchangeRateData.event_date).format('MM월 DD일') : '';

  // 프리셋 버튼 목록 (displayUnit 기준으로 ×1, ×5, ×10, ×100)
  const presets = exchangeRateData?.display_unit
    ? [1, 5, 10, 100].map((m) => exchangeRateData.display_unit! * m).filter((v) => v <= 1_000_000)
    : [1, 100, 1000, 10000];


  // History logic (Chart)
  const chartData = historyData?.history.map((item) => ({
    date: dayjs(item.date).format(DATE_FORMATS[type]),
    rate: item.krwPer1target,
  }));

  const currentChartAvg =
    historyData && historyData.history.length > 0
      ? historyData.history.reduce((sum, t) => sum + t.krwPer1target, 0) / historyData.history.length
      : null;

  const isFavorable = currentChartAvg !== null && krwPer1 !== null && krwPer1 < currentChartAvg;

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
              <Skeleton className="h-8 w-full" />
            </div>
          ) : exchangeRateData && displayedKrw !== null ? (
            <div className="flex flex-col gap-3">
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 gap-1 px-1.5 py-0.5 leading-tight self-start">
                <RefreshCw className="size-2.5" />
                실시간 환율 기준 · {eventDateFormatted}
              </Badge>

              {/* KRW 결과 */}
              <div className="flex items-end gap-2">
                <span className="text-6xl font-bold text-foreground tracking-tight">
                  {displayedKrw.toLocaleString()}
                </span>
                <span className="text-xl text-muted-foreground mb-1.5">KRW</span>
              </div>

              {/* 환산식 */}
              <p className="text-base text-muted-foreground">
                {inputAmount.toLocaleString()} {(exchangeRateData.display_symbol ?? exchangeRateData.target).replace(/\(\d+\)$/, '').trim()} = {displayedKrw.toLocaleString()} KRW
              </p>

              {/* 금액 입력 */}
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="number"
                  min={1}
                  value={inputAmount}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) setInputAmount(v);
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
                <span className="text-sm text-muted-foreground shrink-0">{exchangeRateData.target}</span>
              </div>

              {/* 프리셋 버튼 */}
              <div className="flex flex-wrap gap-1.5">
                {presets.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setInputAmount(v)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
                      inputAmount === v
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-background text-muted-foreground border-input hover:border-blue-400 hover:text-blue-600',
                    )}
                  >
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">데이터 없음</p>
          )}
        </div>

        <div className="mt-4">
        </div>
      </CostCard>

      {/* Right Column (Ratio 6) */}
      <CostCard className="md:w-3/5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-foreground">
            환율 추이
            {historyData?.latest.displaySymbol ? ` (${historyData.latest.displaySymbol.replace(/\(\d+\)$/, '').trim()})` : ''}
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

