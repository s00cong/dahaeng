import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, TrendingUp, TrendingDown, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { costApi, SEOUL_CITY_ID } from '@/api/cost.api';
import type { CostCompare } from '@/schemas/cost.schema';
import { cn } from '@/lib/utils';

// ─── 도시 선택 드롭다운 ───────────────────────────────────────────
interface CityOption { id: number; name: string; dailyBudget: number }

function CitySelector({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: CityOption[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())).slice(0, 50),
    [options, q],
  );

  const selected = options.find((o) => o.id === selectedId);

  return (
    <div className="relative w-full">
      <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 h-11 px-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-medium"
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.name : '도시 선택'}
        </span>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="도시 검색..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 rounded-lg outline-none"
                  autoFocus
                />
              </div>
            </div>
            <ul className="max-h-52 overflow-y-auto">
              {filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(o.id); setOpen(false); setQ(''); }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left',
                      o.id === selectedId && 'bg-blue-50 text-blue-600 dark:bg-blue-950/30',
                    )}
                  >
                    <span>{o.name}</span>
                    <span className="text-xs text-muted-foreground">₩{o.dailyBudget.toLocaleString()}/일</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-4 text-sm text-muted-foreground text-center">검색 결과 없음</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 비교 결과 ───────────────────────────────────────────────────
const ITEM_EMOJI: Record<string, string> = {
  lunch_menu: '🍱',
  dinner_for_2: '🍽️',
  big_mac: '🍔',
  cappuccino: '☕',
  coke: '🥤',
  bus_ticket: '🚌',
  taxi_8km: '🚕',
  brand_jeans: '👖',
  brand_sneakers: '👟',
};

const ITEM_KO: Record<string, string> = {
  lunch_menu: '점심 메뉴',
  dinner_for_2: '2인 저녁',
  big_mac: '빅맥',
  cappuccino: '카푸치노',
  coke: '콜라',
  bus_ticket: '버스 티켓',
  taxi_8km: '택시 8km',
  brand_jeans: '브랜드 청바지',
  brand_sneakers: '브랜드 운동화',
};

function DiffBadge({ pct }: { pct: number }) {
  if (Math.abs(pct) < 1) return <span className="text-xs text-muted-foreground">비슷</span>;
  const cheaper = pct < 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', cheaper ? 'text-emerald-600' : 'text-red-500')}>
      {cheaper ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function CompareResult({ data }: { data: CostCompare }) {
  const { costCompare, expectedTargetDailyBudget: exp, itemComparison } = data;
  const gap = costCompare.dailyBudgetGap;
  const cheaper = gap < 0;

  const totalBudget = exp.breakdown.food + exp.breakdown.transport + exp.breakdown.accommodation;
  const foodPct = totalBudget > 0 ? (exp.breakdown.food / totalBudget) * 100 : 0;
  const transportPct = totalBudget > 0 ? (exp.breakdown.transport / totalBudget) * 100 : 0;
  const accommodationPct = totalBudget > 0 ? (exp.breakdown.accommodation / totalBudget) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 mt-5"
    >
      {/* 하루 예산 비교 */}
      <div className="bg-card rounded-xl border border-border/60 p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">하루 예산 비교</p>
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{data.base.name}</p>
            <p className="text-xl font-black text-foreground">₩{costCompare.baseDailyBudget.toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-center">
            <div className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full text-xs font-bold', cheaper ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
              {cheaper ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
              {Math.abs(costCompare.dailyBudgetGapPercent).toFixed(1)}%
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{data.target.name}</p>
            <p className={cn('text-xl font-black', cheaper ? 'text-emerald-600' : 'text-red-500')}>
              ₩{costCompare.targetDailyBudget.toLocaleString()}
            </p>
          </div>
        </div>
        {/* 예산 바 비교 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{data.base.name}</span>
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (costCompare.baseDailyBudget / Math.max(costCompare.baseDailyBudget, costCompare.targetDailyBudget)) * 100)}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{data.target.name}</span>
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', cheaper ? 'bg-emerald-500' : 'bg-red-400')} style={{ width: `${Math.min(100, (costCompare.targetDailyBudget / Math.max(costCompare.baseDailyBudget, costCompare.targetDailyBudget)) * 100)}%` }} />
            </div>
          </div>
        </div>
        <p className={cn('mt-3 text-sm font-medium text-center', cheaper ? 'text-emerald-600' : 'text-red-500')}>
          {data.target.name}이(가) {data.base.name}보다{' '}
          <strong>₩{Math.abs(gap).toLocaleString()}</strong> {cheaper ? '저렴' : '비쌈'}
        </p>
      </div>

      {/* 지출 구성 */}
      <div className="bg-card rounded-xl border border-border/60 p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{data.target.name} 예상 지출 구성</p>
        <div className="flex h-3 rounded-full overflow-hidden mb-3">
          <div className="bg-orange-400 transition-all" style={{ width: `${foodPct}%` }} title="식비" />
          <div className="bg-blue-400 transition-all" style={{ width: `${transportPct}%` }} title="교통" />
          <div className="bg-purple-400 transition-all" style={{ width: `${accommodationPct}%` }} title="숙박" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="w-2.5 h-2.5 bg-orange-400 rounded-full mx-auto mb-1" />
            <p className="text-muted-foreground">식비</p>
            <p className="font-semibold text-foreground">₩{exp.breakdown.food.toLocaleString()}</p>
          </div>
          <div>
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full mx-auto mb-1" />
            <p className="text-muted-foreground">교통</p>
            <p className="font-semibold text-foreground">₩{exp.breakdown.transport.toLocaleString()}</p>
          </div>
          <div>
            <div className="w-2.5 h-2.5 bg-purple-400 rounded-full mx-auto mb-1" />
            <p className="text-muted-foreground">숙박</p>
            <p className="font-semibold text-foreground">₩{exp.breakdown.accommodation.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 항목별 비교 */}
      <div className="bg-card rounded-xl border border-border/60 p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">항목별 가격 비교 (KRW)</p>
        <div className="space-y-2">
          {itemComparison.items.map((item) => (
            <div key={item.itemKey} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">₩{item.basePrice.toLocaleString()}</p>
              </div>
              <div className="text-center min-w-[110px]">
                <p className="text-xs text-muted-foreground">{ITEM_EMOJI[item.itemKey]} {ITEM_KO[item.itemKey] ?? item.itemName}</p>
                <DiffBadge pct={item.differencePercent} />
              </div>
              <div>
                <p className={cn('text-sm font-medium', item.difference < 0 ? 'text-emerald-600' : item.difference > 0 ? 'text-red-500' : 'text-foreground')}>
                  ₩{item.targetPrice.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-3 px-1">
          <span>{data.base.name}</span>
          <span>{data.target.name}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export function CostCityCompareSection() {
  const [baseId, setBaseId] = useState<number>(SEOUL_CITY_ID);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<{ base: number; target: number } | null>(null);

  // 전체 도시 목록
  const { data: cityList } = useQuery({
    queryKey: ['cost', 'search', 'COUNTRY', '', 'ASC'],
    queryFn: () => costApi.getCostSearch('COUNTRY', '', 'ASC'),
    staleTime: 60 * 60 * 1000,
  });

  const options: CityOption[] = (cityList ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    dailyBudget: c.dailyBudget,
  }));

  // 비교 결과
  const { data: compareData, isLoading } = useQuery({
    queryKey: ['cost', 'compare', 'city', compareIds?.base, compareIds?.target],
    queryFn: () => costApi.getCostCompare('CITY', compareIds!.base, compareIds!.target),
    enabled: compareIds !== null,
    staleTime: 60 * 60 * 1000,
  });

  const handleCompare = () => {
    if (baseId && targetId) {
      setCompareIds({ base: baseId, target: targetId });
    }
  };

  const handleSwap = () => {
    if (targetId) {
      setBaseId(targetId);
      setTargetId(baseId);
      setCompareIds(null);
    }
  };

  return (
    <section aria-label="도시 물가 비교">
      <div className="flex items-center gap-2 mb-5">
        <ArrowLeftRight className="size-5 text-blue-500" />
        <h2 className="text-xl font-bold text-foreground">도시 물가 비교</h2>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5">
        {/* 도시 선택 */}
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <CitySelector
              label="기준 도시"
              options={options}
              selectedId={baseId}
              onSelect={(id) => { setBaseId(id); setCompareIds(null); }}
            />
          </div>

          <button
            type="button"
            onClick={handleSwap}
            disabled={!targetId}
            className="mb-0.5 p-2.5 rounded-xl border border-border hover:bg-muted/50 disabled:opacity-40 transition-colors shrink-0"
            aria-label="도시 교체"
          >
            <ArrowLeftRight className="size-4 text-muted-foreground" />
          </button>

          <div className="flex-1 w-full">
            <CitySelector
              label="비교 도시"
              options={options}
              selectedId={targetId}
              onSelect={(id) => { setTargetId(id); setCompareIds(null); }}
            />
          </div>

          <Button
            onClick={handleCompare}
            disabled={!baseId || !targetId || baseId === targetId}
            className="h-11 px-6 bg-blue-500 hover:bg-blue-400 text-white shrink-0 mb-0.5"
          >
            비교하기
          </Button>
        </div>

        {/* 결과 */}
        {isLoading && (
          <div className="mt-5 space-y-3">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        )}

        {compareData && !isLoading && (
          <CompareResult data={compareData} />
        )}

        {!compareIds && !isLoading && (
          <div className="mt-6 py-10 text-center text-sm text-muted-foreground">
            두 도시를 선택하고 <strong>비교하기</strong>를 눌러주세요
          </div>
        )}
      </div>
    </section>
  );
}
