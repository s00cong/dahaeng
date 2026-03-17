import { TrendingUp, TrendingDown, Info } from 'lucide-react';
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

export function SeoulCompareSection({ data, isLoading }: SeoulCompareSectionProps) {
  const vs = data?.costCompare;
  const isMoreExpensive = (vs?.dailyBudgetGapPercent ?? 0) >= 0;

  const pieData = data
    ? Object.entries(data.expectedTargetDailyBudget.breakdown).map(([key, value]) => ({
        name: BUDGET_LABELS[key] ?? key,
        value,
        color: PIE_COLORS[key] ?? '#94a3b8',
      }))
    : [];

  const targetName = data?.target.name ?? '도시';

  // 서울=0 기준 ±% 다이버전트 차트 데이터
  const barData =
    data?.itemComparison.items.map((item) => ({
      name: ITEM_LABELS[item.itemKey] ?? item.itemName,
      차이: item.differencePercent,
      금액차이: item.difference,
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
                  'text-2xl font-bold leading-tight',
                  isMoreExpensive ? 'text-red-600' : 'text-blue-600',
                )}
              >
                서울보다{' '}
                {Math.abs(vs.dailyBudgetGapPercent).toFixed(1)}%
                <br />
                {isMoreExpensive ? '비싸요' : '저렴해요'}
              </p>
              <p className="text-xs text-muted-foreground">
                하루 예산 기준 · {vs.currency}
              </p>
            </div>

            {/* 오른쪽: 하루 예산 구성 PieChart */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">하루 예산 구성</p>
                <p className="text-xs text-muted-foreground text-right">
                  총 {data.expectedTargetDailyBudget.total.toLocaleString()} {vs.currency}
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
                    formatter={(value, entry) => {
                      const item = pieData.find((d) => d.name === value);
                      const pct = item
                        ? ((item.value / data.expectedTargetDailyBudget.total) * 100).toFixed(0)
                        : '';
                      return `${value} ${pct}%`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
                <Tooltip
                  contentStyle={{ fontSize: 13, borderRadius: 8 }}
                  formatter={(value: number | undefined) => [
                    `${(value ?? 0) >= 0 ? '+' : ''}${(value ?? 0).toFixed(1)}%`,
                    '서울 대비',
                  ]}
                />
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
                        ? (x ?? 0) + w - 8   // 파란색: 바 왼쪽 끝에서 왼쪽으로
                        : (x ?? 0) + w + 8;  // 빨간색: 바 오른쪽 끝에서 오른쪽으로
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
                          {val >= 0 ? '+' : ''}₩{Math.abs(val).toLocaleString()}
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
