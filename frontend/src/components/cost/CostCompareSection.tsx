import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Search,
  Building2,
  Globe,
  Wallet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { costApi, SEOUL_CITY_ID, SEOUL_COUNTRY_ID } from '@/api/cost.api';
import type { CostCompare } from '@/schemas/cost.schema';
import { cn } from '@/lib/utils';
import { CITY_NAME_KO } from '@/data/cityNameKo';
import { COUNTRY_NAME_KO } from '@/data/countryNameKo';

function toKo(name: string) { return CITY_NAME_KO[name] ?? COUNTRY_NAME_KO[name]; }

// ─── 상수 ────────────────────────────────────────────────────────
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
  lunch_menu: '점심',
  dinner_for_2: '2인 저녁',
  big_mac: '빅맥',
  cappuccino: '카푸치노',
  coke: '콜라',
  bus_ticket: '버스',
  taxi_8km: '택시 8km',
  brand_jeans: '청바지',
  brand_sneakers: '운동화',
};

// ─── 검색 드롭다운 ────────────────────────────────────────────────
interface Option { id: number; name: string; nameKo: string; dailyBudget: number; imgUrl?: string | null }

function Selector({
  label,
  placeholder,
  options,
  selectedId,
  onSelect,
  accentColor,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  accentColor: 'blue' | 'emerald';
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => options.filter((o) =>
      o.name.toLowerCase().includes(q.toLowerCase()) || o.nameKo.includes(q)
    ).slice(0, 60),
    [options, q],
  );
  const selected = options.find((o) => o.id === selectedId);
  const accent = accentColor === 'blue'
    ? 'border-blue-400 bg-blue-50/60'
    : 'border-emerald-400 bg-emerald-50/60';
  const pill = accentColor === 'blue'
    ? 'bg-blue-500 text-white'
    : 'bg-emerald-500 text-white';

  return (
    <div className="relative w-full">
      <p className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-widest">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-2 h-14 px-4 rounded-2xl border-2 transition-all text-sm font-semibold shadow-sm',
          selected ? accent : 'border-border bg-background hover:border-slate-300',
        )}
      >
        <span className={selected ? 'text-foreground text-base' : 'text-muted-foreground'}>
          {selected ? (selected.nameKo || selected.name) : placeholder}
        </span>
        <div className="flex items-center gap-2">
          {selected && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold', pill)}>
              ₩{(selected.dailyBudget / 10000).toFixed(1)}만/일
            </span>
          )}
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1.5 w-full bg-background border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-2.5 border-b border-border bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="검색..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-background rounded-xl outline-none border border-border focus:border-blue-400"
                  autoFocus
                />
              </div>
            </div>
            <ul className="max-h-56 overflow-y-auto">
              {filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(o.id); setOpen(false); setQ(''); }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left',
                      o.id === selectedId && (accentColor === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'),
                    )}
                  >
                    <span className="font-medium">
                      {o.nameKo || o.name}
                      {o.nameKo && <span className="text-xs text-muted-foreground ml-1">{o.name}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">₩{o.dailyBudget.toLocaleString()}/일</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-6 text-sm text-muted-foreground text-center">검색 결과 없음</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 커스텀 툴팁 ──────────────────────────────────────────────────
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-xs">
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold">₩{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── 부담률 레벨 ──────────────────────────────────────────────────
function getBurdenLevel(burden: number) {
  if (burden < 30) return {
    label: '매우 여유로움 😊',
    barColor: 'bg-emerald-400',
    bgColor: 'bg-emerald-50 border-emerald-100',
    pillColor: 'bg-emerald-100 text-emerald-700',
  };
  if (burden < 50) return {
    label: '여유로운 편 🙂',
    barColor: 'bg-blue-400',
    bgColor: 'bg-blue-50 border-blue-100',
    pillColor: 'bg-blue-100 text-blue-700',
  };
  if (burden < 70) return {
    label: '보통 😐',
    barColor: 'bg-amber-400',
    bgColor: 'bg-amber-50 border-amber-100',
    pillColor: 'bg-amber-100 text-amber-700',
  };
  if (burden < 100) return {
    label: '빡빡한 편 😤',
    barColor: 'bg-orange-400',
    bgColor: 'bg-orange-50 border-orange-100',
    pillColor: 'bg-orange-100 text-orange-700',
  };
  return {
    label: '매우 빡빡함 😰',
    barColor: 'bg-rose-500',
    bgColor: 'bg-rose-50 border-rose-100',
    pillColor: 'bg-rose-100 text-rose-700',
  };
}

// ─── 비교 결과 ───────────────────────────────────────────────────
function CompareResult({ data }: { data: CostCompare }) {
  const { costCompare, itemComparison, localCostCompare, affordabilityCompare } = data;
  const gap = costCompare.dailyBudgetGap;
  const cheaper = gap < 0;
  const maxBudget = Math.max(costCompare.baseDailyBudget, costCompare.targetDailyBudget);

  const baseNameKo = toKo(data.base.name) ?? data.base.name;
  const targetNameKo = toKo(data.target.name) ?? data.target.name;

  const chartData = itemComparison.items.map((item) => ({
    name: `${ITEM_EMOJI[item.itemKey] ?? ''} ${ITEM_KO[item.itemKey] ?? item.itemName}`,
    [baseNameKo]: item.basePrice,
    [targetNameKo]: item.targetPrice,
    diff: item.differencePercent,
  }));

  return (
    <motion.div
      key="compare-result"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mt-6 flex flex-col gap-5"
    >
      {/* ── 메인 서머리 카드 ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600">

        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />

        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-1">
            {cheaper ? <TrendingDown className="size-5 text-white/80" /> : <TrendingUp className="size-5 text-white/80" />}
            <span className="text-white/80 text-sm font-medium">{targetNameKo} 기준</span>
          </div>
          <p className="text-white text-3xl font-black tracking-tight">
            {baseNameKo}보다{' '}
            <span className="underline decoration-white/40">
              {Math.abs(costCompare.dailyBudgetGapPercent).toFixed(1)}%
            </span>{' '}
            {cheaper ? '저렴' : '비쌈'}
          </p>
          <p className="text-white/70 text-sm mt-1">
            하루 기준 <strong className="text-white">₩{Math.abs(gap).toLocaleString()}</strong> {cheaper ? '절약' : '추가 지출'}
          </p>

          {/* 두 금액 */}
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="bg-white/15 rounded-xl p-3">
              {data.base.img_url && (
                <img src={data.base.img_url} alt={baseNameKo} className="w-full h-48 object-cover rounded-lg mb-2 opacity-80" />
              )}
              <p className="text-white/70 text-xs mb-1">{baseNameKo}</p>
              <p className="text-white text-xl font-black">₩{costCompare.baseDailyBudget.toLocaleString()}</p>
              <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/70 rounded-full"
                  style={{ width: `${(costCompare.baseDailyBudget / maxBudget) * 100}%` }}
                />
              </div>
            </div>
            <div className="bg-white/25 rounded-xl p-3">
              {data.target.img_url && (
                <img src={data.target.img_url} alt={targetNameKo} className="w-full h-48 object-cover rounded-lg mb-2 opacity-80" />
              )}
              <p className="text-white/70 text-xs mb-1">{targetNameKo}</p>
              <p className="text-white text-xl font-black">₩{costCompare.targetDailyBudget.toLocaleString()}</p>
              <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${(costCompare.targetDailyBudget / maxBudget) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 현지인 부담률 ── */}
      {affordabilityCompare && (
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="size-4 text-slate-500" />
            <p className="text-sm font-bold text-foreground">현지인 생활비 부담률</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { name: baseNameKo, burden: affordabilityCompare.baseLocalCostBurdenPercent, income: affordabilityCompare.baseDailyIncome },
              { name: targetNameKo, burden: affordabilityCompare.targetLocalCostBurdenPercent, income: affordabilityCompare.targetDailyIncome },
            ].map((item) => {
              const level = getBurdenLevel(item.burden);
              return (
                <div key={item.name} className={cn('rounded-xl p-3 border', level.bgColor)}>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">{item.name}</p>
                  <p className="text-lg font-black text-foreground">{item.burden.toFixed(1)}%</p>
                  <div className="mt-1.5 h-2 bg-black/10 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', level.barColor)}
                      style={{ width: `${Math.min(item.burden, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">일수입 ₩{item.income.toLocaleString()}</p>
                  <span className={cn('inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full', level.pillColor)}>
                    {level.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className={cn(
            'text-xs font-medium rounded-lg px-3 py-2 text-center',
            affordabilityCompare.targetMoreAffordable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
          )}>
            {targetNameKo}이(가) {baseNameKo}보다{' '}
            {affordabilityCompare.targetMoreAffordable ? '생활비 부담이 낮습니다' : '생활비 부담이 높습니다'}
            {' '}({Math.abs(affordabilityCompare.burdenGapPercentPoint).toFixed(1)}%p 차이)
          </p>
        </div>
      )}

      {/* ── 현지 물가 비교 ── */}
      {localCostCompare && (
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <p className="text-sm font-bold text-foreground mb-3">
            현지 통화 기준 물가
            <span className="ml-2 text-xs text-muted-foreground font-normal">({localCostCompare.currency})</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{baseNameKo}</p>
              <p className="text-base font-black">{localCostCompare.baseLocalDailyCost.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{targetNameKo}</p>
              <p className="text-base font-black">{localCostCompare.targetLocalDailyCost.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {localCostCompare.localDailyCostGap > 0 ? '+' : ''}{localCostCompare.localDailyCostGap.toLocaleString()} ({localCostCompare.localDailyCostGapPercent > 0 ? '+' : ''}{localCostCompare.localDailyCostGapPercent.toFixed(1)}%)
          </p>
        </div>
      )}

      {/* ── 항목별 비교 차트 ── */}
      <div className="bg-card rounded-2xl border border-border/60 p-5">
        <div className="flex items-center gap-2 mb-1">
          <ArrowLeftRight className="size-4 text-slate-500" />
          <p className="text-sm font-bold text-foreground">항목별 가격 비교</p>
          <span className="text-xs text-muted-foreground ml-1">(KRW)</span>
        </div>
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" />
            {baseNameKo}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded-sm inline-block', cheaper ? 'bg-emerald-400' : 'bg-rose-400')} />
            {targetNameKo}
          </span>
        </div>

        <ResponsiveContainer width="100%" height={chartData.length * 52}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
            barCategoryGap="28%"
            barGap={3}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              tickFormatter={(v) => `₩${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={72}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey={baseNameKo} radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#60a5fa" />
              ))}
            </Bar>
            <Bar dataKey={targetNameKo} radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.diff < 0 ? '#34d399' : entry.diff > 0 ? '#f87171' : '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* 차이 뱃지 테이블 */}
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {itemComparison.items.map((item) => {
            const diff = item.differencePercent;
            const isNeutral = Math.abs(diff) < 1;
            const isCheap = diff < 0;
            return (
              <div
                key={item.itemKey}
                className={cn(
                  'flex flex-col items-center rounded-xl py-2 px-1 text-center',
                  isNeutral ? 'bg-slate-50' : isCheap ? 'bg-emerald-50' : 'bg-rose-50',
                )}
              >
                <span className="text-base leading-none">{ITEM_EMOJI[item.itemKey]}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                  {ITEM_KO[item.itemKey] ?? item.itemName}
                </span>
                <span className={cn(
                  'text-[11px] font-black mt-0.5',
                  isNeutral ? 'text-slate-500' : isCheap ? 'text-emerald-600' : 'text-rose-500',
                )}>
                  {isNeutral ? '±0' : `${isCheap ? '' : '+'}${diff.toFixed(1)}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── 로딩 스켈레톤 ────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-4">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
type Mode = 'city' | 'country';

export function CostCompareSection() {
  const [mode, setMode] = useState<Mode>('city');

  // 도시 비교 상태
  const [cityBaseId, setCityBaseId] = useState<number>(SEOUL_CITY_ID);
  const [cityTargetId, setCityTargetId] = useState<number | null>(null);
  const [cityCompareIds, setCityCompareIds] = useState<{ base: number; target: number } | null>(null);

  // 국가 비교 상태
  const [countryBaseId, setCountryBaseId] = useState<number>(SEOUL_COUNTRY_ID);
  const [countryTargetId, setCountryTargetId] = useState<number | null>(null);
  const [countryCompareIds, setCountryCompareIds] = useState<{ base: number; target: number } | null>(null);

  // 도시 목록
  const { data: cityList } = useQuery({
    queryKey: ['cost', 'search', 'COUNTRY', '', 'ASC'],
    queryFn: () => costApi.getCostSearch('COUNTRY', '', 'ASC'),
    staleTime: 60 * 60 * 1000,
  });

  // 국가 목록 (모든 대륙 병렬 조회)
  const { data: countryList } = useQuery({
    queryKey: ['cost', 'search', 'ALL_COUNTRIES'],
    queryFn: () => costApi.getAllCountries(),
    staleTime: 60 * 60 * 1000,
  });

  const cityOptions: Option[] = (cityList ?? []).map((c) => ({ id: c.id, name: c.name, nameKo: toKo(c.name) ?? '', dailyBudget: c.dailyBudget, imgUrl: c.imgUrl }));
  const countryOptions: Option[] = (countryList ?? []).map((c) => ({ id: c.id, name: c.name, nameKo: toKo(c.name) ?? '', dailyBudget: c.dailyBudget, imgUrl: c.imgUrl }));

  // 도시 비교 결과
  const { data: cityCompareData, isLoading: isCityLoading } = useQuery({
    queryKey: ['cost', 'compare', 'city', cityCompareIds?.base, cityCompareIds?.target],
    queryFn: () => costApi.getCostCompare('CITY', cityCompareIds!.base, cityCompareIds!.target),
    enabled: cityCompareIds !== null,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  // 국가 비교 결과
  const { data: countryCompareData, isLoading: isCountryLoading } = useQuery({
    queryKey: ['cost', 'compare', 'country', countryCompareIds?.base, countryCompareIds?.target],
    queryFn: () => costApi.getCostCompare('COUNTRY', countryCompareIds!.base, countryCompareIds!.target),
    enabled: countryCompareIds !== null,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const isCity = mode === 'city';
  const baseId = isCity ? cityBaseId : countryBaseId;
  const targetId = isCity ? cityTargetId : countryTargetId;
  const options = isCity ? cityOptions : countryOptions;
  const compareData = isCity ? cityCompareData : countryCompareData;
  const isLoading = isCity ? isCityLoading : isCountryLoading;
  const compareIds = isCity ? cityCompareIds : countryCompareIds;

  const setBaseId = isCity ? setCityBaseId : setCountryBaseId;
  const setTargetId = isCity ? setCityTargetId : setCountryTargetId;
  const setCompareIds = isCity ? setCityCompareIds : setCountryCompareIds;

  const handleCompare = () => {
    if (baseId && targetId) setCompareIds({ base: baseId, target: targetId });
  };

  const handleSwap = () => {
    if (targetId) {
      setBaseId(targetId);
      setTargetId(baseId);
      setCompareIds(null);
    }
  };

  return (
    <section aria-label="물가 비교">
      {/* ── 섹션 헤더 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="size-5 text-blue-500" />
          <h2 className="text-xl font-bold text-foreground">물가 비교</h2>
        </div>

        {/* 탭 토글 */}
        <div className="flex items-center bg-muted rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setMode('city')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              mode === 'city'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Building2 className="size-3.5" />
            도시 비교
          </button>
          <button
            type="button"
            onClick={() => setMode('country')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              mode === 'country'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Globe className="size-3.5" />
            국가 비교
          </button>
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border/60 shadow-sm p-6">
        {/* ── 선택기 영역 ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === 'city' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {/* 기준 */}
              <div className="flex-1">
                <Selector
                  label={`기준 ${isCity ? '도시' : '국가'}`}
                  placeholder={`${isCity ? '도시' : '국가'} 선택`}
                  options={options}
                  selectedId={baseId}
                  onSelect={(id) => { setBaseId(id); setCompareIds(null); }}
                  accentColor="blue"
                />
              </div>

              {/* VS + 교체 */}
              <div className="flex sm:flex-col items-center justify-center gap-2 sm:pt-6 shrink-0">
                <div className="text-xs font-black text-muted-foreground/50 tracking-widest">VS</div>
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={!targetId}
                  className="p-2 rounded-xl border border-border hover:bg-muted/50 disabled:opacity-30 transition-all hover:scale-110 active:scale-95"
                  aria-label="교체"
                >
                  <ArrowLeftRight className="size-4 text-muted-foreground" />
                </button>
              </div>

              {/* 비교 대상 */}
              <div className="flex-1">
                <Selector
                  label={`비교 ${isCity ? '도시' : '국가'}`}
                  placeholder={`${isCity ? '도시' : '국가'} 선택`}
                  options={options}
                  selectedId={targetId}
                  onSelect={(id) => { setTargetId(id); setCompareIds(null); }}
                  accentColor="emerald"
                />
              </div>
            </div>

            {/* 비교하기 버튼 */}
            <Button
              onClick={handleCompare}
              disabled={!baseId || !targetId || baseId === targetId}
              className="w-full mt-4 h-12 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-2xl shadow-md shadow-blue-200 transition-all hover:shadow-lg hover:shadow-blue-200 disabled:shadow-none"
            >
              {isCity ? '🏙 도시 물가 비교하기' : '🌍 국가 물가 비교하기'}
            </Button>
          </motion.div>
        </AnimatePresence>

        {/* ── 결과 영역 ── */}
        {isLoading && <LoadingSkeleton />}

        {compareData && !isLoading && (
          <CompareResult data={{
            ...compareData,
            base: {
              ...compareData.base,
              img_url: compareData.base.img_url ?? options.find((o) => o.id === baseId)?.imgUrl ?? null,
            },
            target: {
              ...compareData.target,
              img_url: compareData.target.img_url ?? options.find((o) => o.id === targetId)?.imgUrl ?? null,
            },
          }} />
        )}

        {!compareIds && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 py-12 flex flex-col items-center gap-3 text-center"
          >
            <div className="text-5xl">
              {isCity ? '🏙' : '🌍'}
            </div>
            <p className="text-base font-semibold text-muted-foreground">
              {isCity ? '두 도시를 선택하면' : '두 국가를 선택하면'}
            </p>
            <p className="text-sm text-muted-foreground/70">
              하루 예산, 지출 구성, 항목별 가격을 한눈에 비교할 수 있어요
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
