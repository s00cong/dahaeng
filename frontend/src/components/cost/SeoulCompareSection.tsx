import { TrendingUp, TrendingDown, Info, Wallet, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as PieTooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList,
} from 'recharts';
import type { CostCompare } from '@/schemas/cost.schema';

interface SeoulCompareSectionProps {
  data: CostCompare | undefined;
  isLoading: boolean;
  hotelPerDay?: number;
  cityName?: string;
}

const PIE_COLORS: Record<string, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  accommodation: '#a855f7',
};

const BUDGET_LABELS: Record<string, string> = {
  food: '식비',
  transport: '교통',
  accommodation: '숙박',
};

const ITEM_LABELS: Record<string, string> = {
  lunch_menu: '점심 식사',
  dinner_for_2: '레스토랑 저녁 (2인)',
  big_mac: '빅맥',
  cappuccino: '카푸치노',
  coke: '콜라',
  bus_ticket: '편도 버스',
  taxi_8km: '택시 8km',
  brand_jeans: '브랜드 청바지',
  brand_sneakers: '브랜드 운동화',
  beer_in_pub: '맥주 (펍)',
  fast_food: '패스트푸드',
  milk: '우유 (1L)',
  bread: '식빵',
  rice: '쌀 (1kg)',
  egg: '달걀 (12개)',
  chicken: '닭고기 (1kg)',
  steak: '소고기 (1kg)',
  apple: '사과 (1kg)',
  banana: '바나나 (1kg)',
  water: '생수 (1.5L)',
  gym_month: '헬스장 (월)',
  cinema_ticket: '영화 티켓',
  haircut: '헤어컷',
};

interface BarTooltipPayload {
  name: string;
  차이: number;
  금액차이: number;
  서울가격: number;
  도시가격: number;
}

function BarTooltip({ active, payload, targetName }: {
  active?: boolean;
  payload?: { payload: BarTooltipPayload }[];
  targetName: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPositive = d.차이 >= 0;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-4 py-3 text-xs flex flex-col gap-1.5 min-w-[160px]">
      <p className="font-bold text-foreground mb-0.5">{d.name}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">서울</span>
        <span className="font-semibold">₩{d.서울가격.toLocaleString()}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">{targetName}</span>
        <span className="font-semibold">₩{d.도시가격.toLocaleString()}</span>
      </div>
      <div className={cn('flex justify-between gap-4 pt-1 border-t border-border', isPositive ? 'text-red-600' : 'text-blue-600')}>
        <span>서울 대비</span>
        <span className="font-bold">
          {isPositive ? '+' : ''}{d.차이.toFixed(1)}%
          &nbsp;({d.금액차이 >= 0 ? '+₩' : '-₩'}{Math.abs(d.금액차이).toLocaleString()})
        </span>
      </div>
    </div>
  );
}

export function SeoulCompareSection({ data, isLoading, hotelPerDay, cityName: cityNameProp }: SeoulCompareSectionProps) {
  const vs = data?.costCompare;
  // 히어로 카드: localCostCompare 우선, 없으면 costCompare fallback
  const gapPercent = data?.localCostCompare?.localDailyCostGapPercent ?? vs?.dailyBudgetGapPercent ?? 0;
  const isMoreExpensive = gapPercent >= 0;

  const breakdown = data?.expectedTargetDailyBudget.breakdown;
  // accommodation이 백엔드에서 안 오면 city API의 hotelPerDay로 채움
  const accommodationValue = breakdown?.accommodation ?? hotelPerDay;
  const pieData = data
    ? [
        { key: 'food',          value: breakdown?.food ?? 0 },
        { key: 'transport',     value: breakdown?.transport ?? 0 },
        { key: 'accommodation', value: accommodationValue ?? 0 },
      ]
        .filter((d) => d.value > 0)
        .map((d) => ({
          name:  BUDGET_LABELS[d.key] ?? d.key,
          value: d.value,
          color: PIE_COLORS[d.key] ?? '#94a3b8',
        }))
    : [];

  // total: 식비 + 교통 + 숙박(fallback 포함) 직접 합산
  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0);
  const displayTotal = data ? (pieTotal > 0 ? pieTotal : data.expectedTargetDailyBudget.total) : 0;

  const targetName = cityNameProp ?? data?.target.name ?? '도시';

  // 서울=0 기준 ±% 다이버전트 차트 데이터
  const barData =
    data?.itemComparison.items.map((item) => ({
      name: ITEM_LABELS[item.itemKey] ?? item.itemName,
      차이: item.differencePercent,
      금액차이: item.difference,
      서울가격: item.basePrice,
      도시가격: item.targetPrice,
    })) ?? [];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border">
        <span className="text-sm font-semibold text-foreground">서울 대비 물가 비교</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4 p-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : data && vs ? (
        <div className="p-4 flex flex-col gap-6">
          {/* Hero card + Pie chart — 좌우 배치 */}
          <div className="flex gap-4 items-stretch">
            {/* 왼쪽: Hero comparison card */}
            <div
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-3 rounded-xl p-5 text-center',
                isMoreExpensive ? 'bg-red-50 dark:bg-red-950/30' : 'bg-blue-50 dark:bg-blue-950/30',
              )}
            >
              {isMoreExpensive ? (
                <TrendingUp className="size-8 text-red-500" />
              ) : (
                <TrendingDown className="size-8 text-blue-500" />
              )}
              <p
                className={cn(
                  'text-4xl font-bold leading-tight',
                  isMoreExpensive ? 'text-red-600' : 'text-blue-600',
                )}
              >
                서울보다{' '}
                {Math.abs(gapPercent).toFixed(1)}%
                <br />
                {isMoreExpensive ? '비싸요' : '저렴해요'}
              </p>
              <p className="text-sm text-muted-foreground">
                실생활 물가 기준 · {vs.currency}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                {['아침', '점심', '저녁', '커피', '음료', '대중교통(왕복)'].map((item) => (
                  <span
                    key={item}
                    className="text-xs px-2 py-0.5 rounded-full bg-white/60 dark:bg-white/10 text-muted-foreground border border-border"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* 오른쪽: 하루 예산 구성 PieChart */}
            <div className="flex-1 flex flex-col">
              <div className="flex flex-col mb-2">
                <p className="text-sm font-semibold text-foreground">하루 예산 구성</p>
                <p className="text-xl font-bold text-foreground">
                  {displayTotal.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">{vs.currency}</span>
                </p>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="46%"
                    outerRadius={60}
                    innerRadius={30}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <PieTooltip
                    contentStyle={{ fontSize: 13, borderRadius: 8 }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                      `${(value ?? 0).toLocaleString()} ${vs.currency}`,
                      name ?? '',
                    ]}
                  />
                  <Legend
                    iconSize={10}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value, _entry) => {
                      const item = pieData.find((d) => d.name === value);
                      const pct = item && displayTotal > 0
                        ? ((item.value / displayTotal) * 100).toFixed(0)
                        : '';
                      return `${value} ${pct}%`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2개 지표 카드 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 하루 실제 비용 */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Wallet className="size-4 shrink-0" />
                하루 실제 비용
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">서울</span>
                  <span className="font-bold text-base">₩{(data.localCostCompare?.baseLocalDailyCost ?? data.costCompare.baseDailyBudget).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{targetName}</span>
                  <span className="font-bold text-base text-foreground">₩{(data.localCostCompare?.targetLocalDailyCost ?? data.costCompare.targetDailyBudget).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 현지인 부담률 */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Users className="size-4 shrink-0" />
                현지인 부담률
              </div>
              {data.affordabilityCompare ? (
                <div className="flex flex-col gap-0.5">
                  <span className={cn(
                    'text-3xl font-bold leading-tight',
                    data.affordabilityCompare.targetMoreAffordable ? 'text-blue-500' : 'text-amber-500',
                  )}>
                    {data.affordabilityCompare.targetLocalCostBurdenPercent.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {data.affordabilityCompare.targetMoreAffordable ? '현지인에게 여유로운 도시' : '현지인에게도 부담스러운 도시'}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </div>

          {/* 항목별 가격 비교 — 서울 대비 ±% 다이버전트 차트 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">
                항목별 서울 대비 차이 ({targetName})
              </p>
              <span className="text-xs text-muted-foreground">서울 = 0%</span>
            </div>
            <ResponsiveContainer width="100%" height={barData.length * 44 + 40}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 0, right: 80, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                  domain={['auto', 'auto']}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <ReferenceLine x={0} stroke="#64748b" strokeWidth={1.5} />
                <Tooltip content={<BarTooltip targetName={targetName} />} />
                <Bar dataKey="차이" barSize={18} radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="금액차이"
                    position="right"
                    content={(props) => {
                      const { x, y, width, height, value } = props as {
                        x?: number;
                        y?: number;
                        width?: number;
                        height?: number;
                        value?: number;
                      };
                      const val = value ?? 0;
                      const w = width ?? 0;
                      const isNegative = val < 0;
                      const lx = isNegative
                        ? (x ?? 0) + w - 8
                        : (x ?? 0) + w + 8;
                      const ly = (y ?? 0) + (height ?? 0) / 2;
                      const color = isNegative ? '#3b82f6' : '#ef4444';
                      return (
                        <text
                          x={lx}
                          y={ly}
                          fill={color}
                          fontSize={11}
                          fontWeight={700}
                          dominantBaseline="middle"
                          textAnchor={isNegative ? 'end' : 'start'}
                        >
                          {val >= 0 ? '+₩' : '-₩'}{Math.abs(val).toLocaleString()}
                        </text>
                      );
                    }}
                  />
                  {barData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.차이 >= 0 ? '#ef4444' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* 범례 */}
            <div className="flex items-center gap-5 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block w-3.5 h-2.5 rounded-sm bg-red-500" />
                서울보다 비쌈
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block w-3.5 h-2.5 rounded-sm bg-blue-500" />
                서울보다 저렴
              </span>
            </div>
          </div>

          {/* Summary note */}
          {vs.summary && (
            <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <Info className="size-4 mt-0.5 shrink-0" />
              <span>{vs.summary}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-base text-muted-foreground p-4">비교 데이터를 불러올 수 없습니다</p>
      )}
    </div>
  );
}
