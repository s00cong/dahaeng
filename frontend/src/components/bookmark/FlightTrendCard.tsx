import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  type TooltipProps,
} from 'recharts';
import { PlaneTakeoff, TrendingDown, TrendingUp, Minus, Bell } from 'lucide-react';
import { useFlightTrend } from '@/hooks/flight/useFlightTrend';
import { useFlightAlertSubscriptions } from '@/hooks/flight-alert/useFlightAlertSubscriptions';

interface FlightTrendCardProps {
  cityId: number;
}

function formatMonth(yearMonth: string) {
  const [, m] = yearMonth.split('-');
  return `${Number(m)}월`;
}

function formatKRW(price: number) {
  if (price >= 10000) return `${Math.round(price / 10000)}만원`;
  return `₩${price.toLocaleString('ko-KR')}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; color?: string; value?: number | string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, idx) => (
        <p key={`${p.name ?? 'value'}-${idx}`} style={{ color: p.color }} className="font-medium">
          {p.name === 'avg_flight_price' ? '✈ 항공권' : '🏨 호텔'}{' '}
          ₩{Number(p.value).toLocaleString('ko-KR')}
        </p>
      ))}
    </div>
  );
}

export function FlightTrendCard({ cityId }: FlightTrendCardProps) {
  const { data, isLoading } = useFlightTrend(cityId);
  const { data: subscriptions } = useFlightAlertSubscriptions();
  const subscription = subscriptions?.find((s) => s.cityId === cityId && s.enabled);
  const thresholdPrice = subscription?.thresholdPrice;

  const chartData = data?.trend_data.map((d) => ({
    ...d,
    label: formatMonth(d.year_month),
  })) ?? [];

  // 첫·마지막 달 항공가 비교로 추세 계산
  const trend = (() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].avg_flight_price;
    const last = chartData[chartData.length - 1].avg_flight_price;
    const diff = last - first;
    const pct = Math.abs(Math.round((diff / first) * 100));
    if (Math.abs(diff) < first * 0.02) return { type: 'flat', pct } as const;
    return { type: diff > 0 ? 'up' : 'down', pct } as const;
  })();

  const minPrice = Math.min(...chartData.map((d) => d.avg_flight_price));
  const maxPrice = Math.max(...chartData.map((d) => d.avg_flight_price));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <PlaneTakeoff className="size-4 text-indigo-500" />
          </div>
          <p className="text-sm font-semibold text-slate-800">항공권 가격 추이</p>
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            trend.type === 'down'
              ? 'bg-emerald-50 text-emerald-600'
              : trend.type === 'up'
              ? 'bg-red-50 text-red-500'
              : 'bg-slate-50 text-slate-500'
          }`}>
            {trend.type === 'down' && <TrendingDown className="size-3" />}
            {trend.type === 'up' && <TrendingUp className="size-3" />}
            {trend.type === 'flat' && <Minus className="size-3" />}
            {trend.type === 'down' ? `${trend.pct}% 하락` : trend.type === 'up' ? `${trend.pct}% 상승` : '보합'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mb-4 ml-10">
        <p className="text-xs text-slate-400">최근 6개월 평균 항공권 가격</p>
        {thresholdPrice != null && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <Bell className="size-2.5" />
            목표 {formatKRW(thresholdPrice)}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="h-40 flex items-center justify-center text-sm text-slate-400">
          불러오는 중...
        </div>
      )}

      {!isLoading && chartData.length === 0 && (
        <div className="h-40 flex items-center justify-center text-sm text-slate-400">
          데이터가 없습니다
        </div>
      )}

      {!isLoading && chartData.length > 0 && (
        <>
          {/* 최고·최저 요약 */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] text-slate-400 mb-0.5">최저</p>
              <p className="text-sm font-bold text-emerald-600">{formatKRW(minPrice)}</p>
            </div>
            <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] text-slate-400 mb-0.5">최고</p>
              <p className="text-sm font-bold text-red-500">{formatKRW(maxPrice)}</p>
            </div>
            <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] text-slate-400 mb-0.5">평균</p>
              <p className="text-sm font-bold text-slate-700">
                {formatKRW(Math.round(chartData.reduce((s, d) => s + d.avg_flight_price, 0) / chartData.length))}
              </p>
            </div>
          </div>

          {/* 차트 */}
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="flightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) => formatKRW(v)}
                domain={[
                  (min: number) => Math.floor(Math.min(min, thresholdPrice ?? min) * 0.93 / 10000) * 10000,
                  (max: number) => Math.ceil(Math.max(max, thresholdPrice ?? max) * 1.05 / 10000) * 10000,
                ]}
              />
              <Tooltip content={<CustomTooltip />} />
              {thresholdPrice != null && (
                <ReferenceLine
                  y={thresholdPrice}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  label={{
                    value: `목표 ${formatKRW(thresholdPrice)}`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#f59e0b',
                    fontWeight: 600,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="avg_flight_price"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#flightGrad)"
                dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
