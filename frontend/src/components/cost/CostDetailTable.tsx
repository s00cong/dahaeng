import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CostDetail, LivingCost } from '@/schemas/cost.schema';

interface CostDetailTableProps {
  data: CostDetail | undefined;
  isLoading: boolean;
  seoulLivingCost?: LivingCost;
  cityName?: string;
}

const EATING_OUT_LABELS: Record<string, string> = {
  lunch_menu: '점심 식사',
  dinner_in_a_resturant_for_2: '레스토랑 저녁 (2인)',
  fast_food_meal: '패스트푸드',
  beer_in_a_pub: '맥주 (펍)',
  cappuccino: '카푸치노',
  coke_pepsi: '콜라/펩시',
};

const TRANSPORT_LABELS: Record<string, string> = {
  local_transport_ticket: '편도 대중교통',
  monthly_ticket_local_transport: '대중교통 월정기권',
  taxi_ride: '택시 기본요금',
  gas_petrol: '휘발유 (1L)',
};

const GROCERIES_LABELS: Record<string, string> = {
  milk: '우유 (1L)', bread: '식빵', rice: '쌀 (1kg)', egg: '달걀 (12개)',
  chicken: '닭고기 (1kg)', steak: '소고기 (1kg)', apple: '사과 (1kg)',
  banana: '바나나 (1kg)', orange: '오렌지 (1kg)', tomato: '토마토 (1kg)',
  potato: '감자 (1kg)', onion: '양파 (1kg)', water: '생수 (1.5L)',
  coke: '콜라 (0.33L)', wine: '와인 (중급)', beer: '맥주 (0.5L)',
  cigarette: '담배 (1갑)', cold_medicine: '감기약', shampoo: '샴푸',
  toilet_paper: '화장지 (8롤)', toothpaste: '치약',
};

const OTHER_LABELS: Record<string, string> = {
  gym_month: '헬스장 (월)',
  cinema_ticket: '영화 티켓',
  haircut: '헤어컷',
  brand_jeans: '브랜드 청바지',
  brand_sneakers: '브랜드 운동화',
};

function calcDiff(cityVal: number, seoulVal: number): number {
  if (seoulVal === 0) return 0;
  return ((cityVal - seoulVal) / seoulVal) * 100;
}

// ── 단일 항목 렌더러 ──────────────────────────────────────────────────────────
interface ItemRowProps {
  cityVal: number;
  seoulVal: number | undefined;
  label: string;
  cityName: string;
}

function priceSize(isExpensive: boolean, absDiff: number): string {
  if (!isExpensive) return 'text-[11px] font-semibold';
  if (absDiff >= 60) return 'text-[17px] font-black';
  if (absDiff >= 30) return 'text-[15px] font-extrabold';
  if (absDiff >= 10) return 'text-[13px] font-bold';
  return 'text-[11px] font-semibold';
}

function ItemRow({ cityVal, seoulVal, label, cityName }: ItemRowProps) {
  const diff = seoulVal !== undefined ? calcDiff(cityVal, seoulVal) : null;
  const isHigher = diff !== null && diff >= 0;
  const absDiff = diff !== null ? Math.abs(diff) : 0;

  return (
    <div className="px-3.5 py-3">
      {/* 행 1: 항목명 + 배지 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground truncate mr-2">{label}</span>
        {diff !== null && (
          <Badge
            className={cn(
              'px-1.5 py-0.5 text-[10px] font-bold border-none shrink-0 rounded-full',
              isHigher ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600',
            )}
          >
            {isHigher ? '+' : ''}{diff.toFixed(1)}%
          </Badge>
        )}
      </div>

      {/* 행 2: 서울 | ⇄ | 도시 (비싼 쪽 글자 크게) */}
      {seoulVal !== undefined && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-muted-foreground mb-0.5">서울</p>
            <p className={cn('leading-none', priceSize(!isHigher, absDiff), !isHigher ? 'text-red-600' : 'text-blue-600')}>
              {Math.round(seoulVal).toLocaleString()}원
            </p>
          </div>
          <span className="text-xs text-muted-foreground/50 shrink-0">⇄</span>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[9px] text-muted-foreground mb-0.5">{cityName}</p>
            <p className={cn('leading-none', priceSize(isHigher, absDiff), isHigher ? 'text-red-600' : 'text-blue-600')}>
              {Math.round(cityVal).toLocaleString()}원
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 카드 컴포넌트 (controlled) ─────────────────────────────────────────────────
interface CategoryCardProps {
  title: string;
  cityData: Record<string, number>;
  seoulData: Record<string, number> | undefined;
  labels: Record<string, string>;
  cityName: string;
  isOpen: boolean;
  onToggle: () => void;
  /** 내부 항목을 몇 열로 표시할지 (기본 1) */
  innerCols?: 1 | 2 | 3;
  className?: string;
}

function CategoryCard({
  title, cityData, seoulData, labels, cityName,
  isOpen, onToggle, innerCols = 1, className,
}: CategoryCardProps) {
  const itemCount = Object.keys(cityData).length;
  const entries = Object.entries(cityData);

  const { expensiveCount, cheapCount } = seoulData
    ? Object.entries(cityData).reduce(
        (acc, [key, cityVal]) => {
          const seoulVal = seoulData[key];
          if (seoulVal === undefined || seoulVal === 0) return acc;
          if (cityVal > seoulVal) acc.expensiveCount++;
          else if (cityVal < seoulVal) acc.cheapCount++;
          return acc;
        },
        { expensiveCount: 0, cheapCount: 0 },
      )
    : { expensiveCount: 0, cheapCount: 0 };

  const innerGridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  }[innerCols];

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border overflow-hidden transition-shadow duration-300',
        isOpen ? 'shadow-md' : 'shadow-sm',
        className,
      )}
    >
      {/* 헤더 */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3.5 transition-colors duration-200',
          isOpen ? 'border-b border-border bg-card' : 'bg-muted/30 hover:bg-muted/50',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <AnimatePresence>
            {!isOpen && (
              <motion.span
                key="count"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                  {itemCount}개 항목
                </span>
                {seoulData && (
                  <>
                    {expensiveCount > 0 && (
                      <span className="text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                        ↑{expensiveCount}
                      </span>
                    )}
                    {cheapCount > 0 && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                        ↓{cheapCount}
                      </span>
                    )}
                  </>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="shrink-0 ml-2"
        >
          <ChevronDown className="size-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* 슬라이드 콘텐츠 */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className={cn('grid divide-border/50', innerGridClass, innerCols > 1 ? 'divide-x' : 'divide-y')}>
              {entries.map(([key, cityVal]) => (
                <div key={key} className={innerCols > 1 ? 'border-b border-border/50 last:border-b-0' : ''}>
                  <ItemRow
                    cityVal={cityVal}
                    seoulVal={seoulData?.[key]}
                    label={labels[key] ?? key}
                    cityName={cityName}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function calcTotalCounts(
  lc: LivingCost,
  seoulLivingCost: LivingCost | undefined,
): { expensive: number; cheap: number; total: number } {
  if (!seoulLivingCost) return { expensive: 0, cheap: 0, total: 0 };

  const categories: [Record<string, number>, Record<string, number>][] = [
    [lc.groceries as Record<string, number>, seoulLivingCost.groceries as Record<string, number>],
    [lc.eating_out as Record<string, number>, seoulLivingCost.eating_out as Record<string, number>],
    [lc.transportation as Record<string, number>, seoulLivingCost.transportation as Record<string, number>],
    [lc.other as Record<string, number>, seoulLivingCost.other as Record<string, number>],
  ];

  let expensive = 0;
  let cheap = 0;
  let total = 0;

  for (const [city, seoul] of categories) {
    for (const [key, cityVal] of Object.entries(city)) {
      const seoulVal = seoul[key];
      if (seoulVal === undefined || seoulVal === 0) continue;
      total++;
      if (cityVal > seoulVal) expensive++;
      else if (cityVal < seoulVal) cheap++;
    }
  }

  return { expensive, cheap, total };
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export function CostDetailTable({ data, isLoading, seoulLivingCost, cityName: cityNameProp }: CostDetailTableProps) {
  const cityName = cityNameProp ?? data?.target.name ?? '도시';
  const lc = data?.living_cost;

  // 마트/식료품은 독립 토글, 나머지 3개는 공유 토글 (초기 상태: 닫힘)
  const [groceriesOpen, setGroceriesOpen] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);

  const toggleBottom = () => setBottomOpen((v) => !v);

  const totals = lc ? calcTotalCounts(lc, seoulLivingCost) : null;
  const expensivePct = totals && totals.total > 0 ? (totals.expensive / totals.total) * 100 : 0;
  const cheapPct = totals && totals.total > 0 ? (totals.cheap / totals.total) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">{cityName} 전체 물가표</h2>
        {lc && (
          <Badge className="text-xs bg-blue-500/10 text-blue-600 border-none px-2 py-0.5 gap-1">
            <DollarSign className="size-3" />
            하루 예산 {Math.round(lc.daily_budget).toLocaleString()}원
          </Badge>
        )}
      </div>

      {/* 전체 비율 바 */}
      {totals && totals.total > 0 && (
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-red-600 font-semibold">
              <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />
              서울보다 비쌈 {totals.expensive}개
            </span>
            <span className="text-muted-foreground font-medium">전체 {totals.total}개 항목</span>
            <span className="flex items-center gap-1 text-blue-600 font-semibold">
              서울보다 저렴 {totals.cheap}개
              <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />
            </span>
          </div>
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${expensivePct}%` }}
            />
            <div
              className="bg-blue-500 transition-all duration-500"
              style={{ width: `${cheapPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{expensivePct.toFixed(0)}%</span>
            <span>{(100 - expensivePct - cheapPct).toFixed(0)}% 동일</span>
            <span>{cheapPct.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          서울
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          {cityName}
        </span>
        <span className="ml-auto text-[10px] opacity-60">비싼 쪽 글자가 더 크게 표시</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      ) : lc ? (
        <>
          {/* ── 행 1: 마트 및 식료품 (가로 전체, 내부 3열) ── */}
          <CategoryCard
            title="🛒 마트 및 식료품"
            cityData={lc.groceries as Record<string, number>}
            seoulData={seoulLivingCost?.groceries as Record<string, number> | undefined}
            labels={GROCERIES_LABELS}
            cityName={cityName}
            isOpen={groceriesOpen}
            onToggle={() => setGroceriesOpen((v) => !v)}
            innerCols={3}
          />

          {/* ── 행 2: 나머지 3개 카드 (공유 토글) ── */}
          <div className="grid grid-cols-3 gap-4 items-start">
            <CategoryCard
              title="🍴 외식 및 카페"
              cityData={lc.eating_out as Record<string, number>}
              seoulData={seoulLivingCost?.eating_out as Record<string, number> | undefined}
              labels={EATING_OUT_LABELS}
              cityName={cityName}
              isOpen={bottomOpen}
              onToggle={toggleBottom}
            />
            <CategoryCard
              title="🚌 교통"
              cityData={lc.transportation as Record<string, number>}
              seoulData={seoulLivingCost?.transportation as Record<string, number> | undefined}
              labels={TRANSPORT_LABELS}
              cityName={cityName}
              isOpen={bottomOpen}
              onToggle={toggleBottom}
            />
            <CategoryCard
              title="🎬 여가 및 기타"
              cityData={lc.other as Record<string, number>}
              seoulData={seoulLivingCost?.other as Record<string, number> | undefined}
              labels={OTHER_LABELS}
              cityName={cityName}
              isOpen={bottomOpen}
              onToggle={toggleBottom}
            />
          </div>
        </>
      ) : (
        <p className="text-base text-muted-foreground">물가 데이터를 불러올 수 없습니다</p>
      )}
    </div>
  );
}
