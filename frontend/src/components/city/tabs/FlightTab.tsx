import { useState, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Plane, Clock, Hotel, TrendingUp, TrendingDown, Minus, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCitySummary } from '@/hooks/flight/useCitySummary';
import { useFlightCalendar } from '@/hooks/flight/useFlightCalendar';
import { useFlightTrend } from '@/hooks/flight/useFlightTrend';
import dayjs from '@/utils/dayjs';
import type { CityDetail } from '@/schemas/city.schema';
import type {
  CitySummary,
  FlightCalendar,
  FlightTrend,
  DailyPriceEntry,
} from '@/schemas/flight.schema';

interface FlightTabProps {
  city: CityDetail;
}

export function FlightTab({ city }: FlightTabProps) {
  const MONTH_TABS = useMemo(() => {
    const now = dayjs();
    return Array.from({ length: 6 }, (_, i) => {
      const d = now.add(i, 'month');
      return { yearMonth: d.format('YYYY-MM'), label: d.format('YYYY.MM') };
    });
  }, []);

  const [selectedYearMonth, setSelectedYearMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [activeDay, setActiveDay] = useState<SelectedDay | null>(null);
  
  // ─── 왕복 범위 선택 상태 ───
  const [departure, setDeparture] = useState<{ date: string; entry: DailyPriceEntry } | null>(null);
  const [returnDate, setReturnDate] = useState<{ date: string; entry: DailyPriceEntry } | null>(null);

  const cityId = city.cityId;
  const rightColRef = useRef<HTMLDivElement>(null);

  // 디바운스: 셀 이동 시 패널이 즉시 사라지지 않도록
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSetActiveDay = useCallback((day: SelectedDay | null) => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    if (day !== null) {
      setActiveDay(day);
    } else {
      clearTimerRef.current = setTimeout(() => setActiveDay(null), 180);
    }
  }, []);

  const { data: summary, isLoading: summaryLoading } = useCitySummary(cityId, selectedYearMonth);
  
  // 현재 월 및 다음 월 데이터 가져오기 (월간 경계 가격 조회용)
  const nextMonthTab = MONTH_TABS.find((_, i) => i > 0 && MONTH_TABS[i - 1].yearMonth === selectedYearMonth);
  const nextYearMonth = nextMonthTab?.yearMonth;

  const { data: calendar, isLoading: calendarLoading } = useFlightCalendar(cityId, selectedYearMonth);
  const { data: nextCalendar } = useFlightCalendar(cityId, nextYearMonth || '');

  const { data: trend, isLoading: trendLoading } = useFlightTrend(cityId);

  const selectedMonth = dayjs(selectedYearMonth + '-01').month() + 1;
  const isPeakSeason = summary?.peak_season_months.includes(selectedMonth) ?? false;
  const isOffSeason = summary?.off_season_months.includes(selectedMonth) ?? false;

  // ─── 왕복 합계 및 기간 계산 ───
  const travelDuration = (departure && returnDate) 
    ? dayjs(returnDate.date).diff(dayjs(departure.date), 'day')
    : null;

  const totalRangePrice = (departure && returnDate) 
    ? (departure.entry.price + returnDate.entry.price) 
    : null;

  // 날짜 클릭 핸들러
  const handleDayClick = (day: number, outbound: DailyPriceEntry | undefined, inbound: DailyPriceEntry | undefined) => {
    const clickedDate = `${selectedYearMonth}-${String(day).padStart(2, '0')}`;
    
    // 1. 선택 초기화 (이미 범위가 완성되었거나, 아무것도 선택 안된 상태에서 클릭 시)
    if (!departure || (departure && returnDate)) {
      if (outbound) {
        setDeparture({ date: clickedDate, entry: outbound });
        setReturnDate(null);
      }
    } 
    // 2. 귀국일 선택
    else {
      // 출발일보다 앞선 날짜를 클릭하면 출발일을 변경
      if (dayjs(clickedDate).isBefore(dayjs(departure.date))) {
        if (outbound) setDeparture({ date: clickedDate, entry: outbound });
      } 
      // 출발일 이후면 귀국일로 설정
      else if (inbound) {
        setReturnDate({ date: clickedDate, entry: inbound });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto relative">
      {/* 월 선택 탭 */}
      <div className="flex gap-2.5 flex-wrap" role="tablist" aria-label="월 선택">
        {MONTH_TABS.map((tab) => {
          const active = tab.yearMonth === selectedYearMonth;
          const month = dayjs(tab.yearMonth + '-01').month() + 1;
          const peak = summary?.peak_season_months.includes(month);
          const off = summary?.off_season_months.includes(month);
          return (
            <button
              key={tab.yearMonth}
              role="tab"
              aria-selected={active}
              onClick={() => { setSelectedYearMonth(tab.yearMonth); setActiveDay(null); setDeparture(null); setReturnDate(null); }}
              className={cn(
                'px-4 py-2 rounded-xl text-lg font-bold transition-colors relative',
                active
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400',
              )}
            >
              {tab.label}
              {peak && <span className="absolute -top-1 -right-1 size-2.5 bg-red-400 rounded-full border-2 border-background" />}
              {off && <span className="absolute -top-1 -right-1 size-2.5 bg-blue-400 rounded-full border-2 border-background" />}
            </button>
          );
        })}
      </div>

      <SummarySection isLoading={summaryLoading} summary={summary} />

      {/* 메인 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <div className="flex flex-col gap-4">
          <FlightCalendarGrid
            isLoading={calendarLoading}
            calendar={calendar}
            nextCalendar={nextCalendar}
            yearMonth={selectedYearMonth}
            isPeakSeason={isPeakSeason}
            isOffSeason={isOffSeason}
            activeDay={activeDay}
            onHoverDay={debouncedSetActiveDay}
            // 범위 상태 전달
            departureDate={departure?.date || null}
            returnDate={returnDate?.date || null}
            totalRangePrice={totalRangePrice}
            travelDuration={travelDuration}
            onDayClick={handleDayClick}
          />
        </div>

        <div
          ref={rightColRef}
          className="flex flex-col gap-4 min-w-0"
        >
          {/* 6개월 추이 차트 vs 날짜 히스토리 스왑 레이아웃 */}
          <div className="flex-1 relative overflow-hidden rounded-xl border border-border/50 bg-card/50 min-h-[380px] flex flex-col">
            <AnimatePresence mode="wait">
              {(activeDay || departure) ? (
                <motion.div
                  key="history-overlay"
                  className="flex-1 flex flex-col items-center justify-center p-0 bg-slate-500/5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <DateHistoryPanel
                    activeDay={activeDay}
                    departure={departure}
                    returnDate={returnDate}
                    yearMonth={selectedYearMonth}
                    onClear={() => {
                      setDeparture(null);
                      setReturnDate(null);
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="trend-section"
                  className="flex-1 p-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <TrendSection isLoading={trendLoading} trend={trend} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 섹션 1: 도시 요약 ───────────────────────────────────────────────────────

function SummarySection({ isLoading, summary }: { isLoading: boolean; summary: CitySummary | undefined }) {
  if (isLoading) return <Skeleton className="w-full h-24 rounded-xl" />;
  if (!summary) return <EmptyState message="요약 정보를 불러올 수 없습니다." />;

  // Note: FlightSummary type might be used differently here depending on the schema
  // But based on common patterns, we show key metrics
  return (
    <section aria-label="도시 요약 정보">
      <div className="bg-card border border-border rounded-xl px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 flex-1 justify-center">
          <Plane className="size-5 text-blue-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">항공권 평균</span>
            <span className="text-base font-black text-foreground">{summary.avg_flight_price.toLocaleString()}원</span>
          </div>
        </div>
        <div className="w-px h-8 bg-border mx-2" />
        <div className="flex items-center gap-3 flex-1 justify-center">
          <Hotel className="size-5 text-emerald-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">숙박비 평균</span>
            <span className="text-base font-black text-foreground">{summary.avg_hotel_price.toLocaleString()}원</span>
          </div>
        </div>
        <div className="w-px h-8 bg-border mx-2" />
        <div className="flex items-center gap-3 flex-1 justify-center text-center">
          <Plane className="size-5 text-slate-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">경유</span>
            <span className="text-base font-black text-slate-700 dark:text-slate-300">{summary.typical_stops_text}</span>
          </div>
        </div>
        <div className="w-px h-8 bg-border mx-2" />
        <div className="flex items-center gap-3 flex-1 justify-center text-center">
          <Clock className="size-5 text-slate-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">평균 비행</span>
            <span className="text-base font-black text-slate-700 dark:text-slate-300">{summary.min_duration_text}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 섹션 2: 달력형 일별 가격 ─────────────────────────────────────────────────

type PriceView = 'outbound' | 'inbound' | 'total';

const PRICE_VIEW_LABELS: Record<PriceView, string> = {
  outbound: '가는편',
  inbound: '오는편',
  total: '합계',
};

function formatWan(price: number | null): string {
  if (price === null) return '';
  return parseFloat((price / 10000).toFixed(1)) + '만';
}

type SelectedDay = {
  day: number;
  outbound: DailyPriceEntry | undefined;
  inbound: DailyPriceEntry | undefined;
};

function FlightCalendarGrid({
  isLoading,
  calendar,
  nextCalendar,
  yearMonth,
  isPeakSeason,
  isOffSeason,
  activeDay,
  onHoverDay,
  departureDate,
  returnDate,
  totalRangePrice,
  travelDuration,
  onDayClick,
}: {
  isLoading: boolean;
  calendar: FlightCalendar | undefined;
  nextCalendar: FlightCalendar | undefined;
  yearMonth: string;
  isPeakSeason: boolean;
  isOffSeason: boolean;
  activeDay: SelectedDay | null;
  onHoverDay: (day: SelectedDay | null) => void;
  departureDate: string | null;
  returnDate: string | null;
  totalRangePrice: number | null;
  travelDuration: number | null;
  onDayClick: (day: number, outbound: DailyPriceEntry | undefined, inbound: DailyPriceEntry | undefined) => void;
}) {
  const [priceView, setPriceView] = useState<PriceView>('total');

  const { cells, outboundMap, inboundMap, fullInboundMap, today, minPrice } = useMemo(() => {
    const base = dayjs(yearMonth + '-01');
    const firstDow = base.day();
    const days = base.daysInMonth();
    const todayStr = dayjs().format('YYYY-MM-DD');

    const outMap = new Map<number, DailyPriceEntry>();
    const inMap = new Map<number, DailyPriceEntry>();
    const fullInMap = new Map<string, DailyPriceEntry>();

    // 현재 월 데이터 맵핑
    if (calendar) {
      for (const d of calendar.outbound_daily_prices) outMap.set(dayjs(d.date).date(), d);
      for (const d of calendar.inbound_daily_prices) {
        inMap.set(dayjs(d.date).date(), d);
        fullInMap.set(d.date, d);
      }
    }

    // 다음 월 데이터 맵핑 (경계 계산용)
    if (nextCalendar) {
      for (const d of nextCalendar.inbound_daily_prices) {
        fullInMap.set(d.date, d);
      }
    }

    const raw: (number | null)[] = [
      ...Array<null>(firstDow).fill(null),
      ...Array.from({ length: days }, (_, i) => i + 1),
    ];
    while (raw.length % 7 !== 0) raw.push(null);

    // 최소 가격 계산
    let currentMinPrice = Number.POSITIVE_INFINITY;
    for (let day = 1; day <= days; day++) {
      const currentFullDate = `${yearMonth}-${String(day).padStart(2, '0')}`;
      const out = outMap.get(day);
      const inn = inMap.get(day);

      let price: number | undefined;
      if (priceView === 'outbound') {
        price = out?.price;
      } else if (priceView === 'inbound') {
        price = inn?.price;
      } else if (priceView === 'total') {
        if (travelDuration !== null) {
          const outPrice = out?.price;
          const inboundDateStr = dayjs(currentFullDate).add(travelDuration, 'day').format('YYYY-MM-DD');
          const innPrice = fullInMap.get(inboundDateStr)?.price;
          if (outPrice !== undefined && innPrice !== undefined) {
            price = outPrice + innPrice;
          }
        } else if (currentFullDate === departureDate && returnDate) {
          // 이 경우는 이미 선택된 상태이므로 루프에서 굳이 처리하지 않아도 되지만 일관성을 위해 유지
          // 실제로는 모든 날짜에 대해 '출발일'로 가정하고 travelDuration이 있을 때만 계산하는 것이 맞음
        }
      }

      if (price !== undefined && price < currentMinPrice) {
        currentMinPrice = price;
      }
    }

    return {
      cells: raw,
      outboundMap: outMap,
      inboundMap: inMap,
      fullInboundMap: fullInMap,
      today: todayStr.startsWith(yearMonth) ? dayjs(todayStr).date() : null,
      daysInMonth: days,
      minPrice: currentMinPrice === Number.POSITIVE_INFINITY ? null : currentMinPrice,
    };
  }, [calendar, nextCalendar, yearMonth, priceView, travelDuration, departureDate, returnDate]);

  const handleDayHover = (day: number | null) => {
    if (day === null) {
      onHoverDay(null);
      return;
    }
    const out = outboundMap.get(day);
    const inn = inboundMap.get(day);
    if (!out && !inn) return;
    onHoverDay({ day, outbound: out, inbound: inn });
  };

  if (isLoading) return <Skeleton className="w-full h-80 rounded-xl" />;

  return (
    <section aria-label="일별 항공권 가격" className="h-full flex flex-col">
      <div className="flex flex-col mb-3 gap-2 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-foreground">
              {dayjs(yearMonth + '-01').format('YYYY년 M월')}
            </h3>
            {isPeakSeason && <Badge className="text-[10px] px-1.5 py-0 h-5 bg-red-100 text-red-600 border-0 font-bold">성수기</Badge>}
            {isOffSeason && <Badge className="text-[10px] px-1.5 py-0 h-5 bg-blue-100 text-blue-600 border-0 font-bold">비성수기</Badge>}
          </div>
          <div className="flex rounded-lg overflow-hidden border border-border text-xs font-bold shadow-sm">
            {(['outbound', 'inbound', 'total'] as PriceView[]).map((v) => (
              <button
                key={v}
                onClick={() => { setPriceView(v); onHoverDay(null); }}
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  priceView === v ? 'bg-slate-800 text-white' : 'bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {PRICE_VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
        
        <p className="text-[10px] font-bold text-muted-foreground/80 flex items-center gap-1.5">
          <AlertCircle className="size-3 text-blue-500" />
          {!departureDate 
            ? "출발일을 선택하시면 최적의 가격을 찾아드립니다." 
            : !returnDate 
            ? "귀국일을 선택해 주세요. 왕복 가격이 계산됩니다." 
            : `선택하신 ${travelDuration}박 일정의 왕복 합계 가격이 달력에 표시됩니다.`}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-1">
        <div className="grid grid-cols-7 border-b border-border bg-muted/10">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div key={d} className={cn(
              'py-1.5 text-center text-xs font-black',
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600',
            )}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7" onMouseLeave={() => handleDayHover(null)}>
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} className="py-2" />;

            const currentFullDate = `${yearMonth}-${String(day).padStart(2, '0')}`;
            const out = outboundMap.get(day);
            const inn = inboundMap.get(day);
            
            let price: number | undefined;
            if (priceView === 'outbound') {
              price = out?.price;
            } else if (priceView === 'inbound') {
              price = inn?.price;
            } else if (priceView === 'total') {
              if (travelDuration !== null) {
                const outPrice = out?.price;
                const inboundDateStr = dayjs(currentFullDate).add(travelDuration, 'day').format('YYYY-MM-DD');
                const innPrice = fullInboundMap.get(inboundDateStr)?.price;
                if (outPrice !== undefined && innPrice !== undefined) {
                  price = outPrice + innPrice;
                }
              } else if (currentFullDate === departureDate && returnDate) {
                price = totalRangePrice ?? undefined;
              }
            }

            const isToday = day === today;
            const isSelected = activeDay?.day === day;
            const hasData = (priceView === 'outbound' && out) || (priceView === 'inbound' && inn) || (priceView === 'total');
            const dow = idx % 7;
            const isPast = dayjs(currentFullDate).isBefore(dayjs().startOf('day'));

            const isDeparture = departureDate === currentFullDate;
            const isReturn = returnDate === currentFullDate;
            const isInRange = departureDate && returnDate &&
                             dayjs(currentFullDate).isAfter(dayjs(departureDate)) &&
                             dayjs(currentFullDate).isBefore(dayjs(returnDate));
            const isMinPrice = price !== undefined && price === minPrice;

            return (
              <button
                key={day}
                onMouseEnter={() => !isPast && handleDayHover(day)}
                onClick={() => !isPast && onDayClick(day, out, inn)}
                disabled={!hasData || isPast}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1.5 gap-0.5 min-h-[56px] border-r border-b border-border/40 last:border-r-0 transition-all',
                  isPast && 'cursor-not-allowed bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(0,0,0,0.04)_4px,rgba(0,0,0,0.04)_5px)]',
                  !isPast && hasData && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  !isPast && !hasData && 'cursor-default opacity-40',
                  !isPast && isInRange && 'bg-blue-50 dark:bg-blue-900/20',
                  !isPast && (isDeparture || isReturn) && 'bg-blue-600 text-white z-10 shadow-md scale-105 rounded-md',
                  !isPast && !isDeparture && !isReturn && isSelected && 'bg-slate-100 dark:bg-slate-800',
                )}
              >
                <span className={cn(
                  'text-base font-black w-7 h-7 flex items-center justify-center rounded-full transition-all',
                  isPast && 'text-slate-300 line-through',
                  !isPast && isToday && !isDeparture && !isReturn && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
                  !isPast && ((isDeparture || isReturn) ? 'text-white' : (dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-foreground')),
                )}>
                  {day}
                </span>
                
                {!isPast && price !== undefined ? (
                  <span className={cn(
                    'text-[10px] leading-none font-black',
                    (isDeparture || isReturn) ? 'text-blue-50' : isMinPrice ? 'text-orange-600 underline decoration-2' : 'text-blue-600',
                  )}>
                    {formatWan(price)}
                  </span>
                ) : (
                  <span className="text-[10px] leading-none text-transparent select-none">-</span>
                )}

                {!isPast && isDeparture && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] font-black bg-white text-blue-600 px-1 rounded border border-blue-600">출발</span>}
                {!isPast && isReturn && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] font-black bg-white text-blue-600 px-1 rounded border border-blue-600">귀국</span>}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-3 px-3 py-2 border-t border-border bg-muted/5">
          <div className="flex items-center gap-1">
            <div className="size-2.5 rounded bg-orange-600" />
            <span className="text-[10px] font-bold text-muted-foreground">최저가</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-2.5 rounded-full bg-blue-600" />
            <span className="text-[10px] font-bold text-muted-foreground">오늘</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-2.5 rounded bg-[repeating-linear-gradient(135deg,#e2e8f0,#e2e8f0_2px,transparent_2px,transparent_4px)]" />
            <span className="text-[10px] font-bold text-muted-foreground">지난 날짜</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 날짜 히스토리 패널 ───────────────────────────────────────────────────────

function DateHistoryPanel({
  activeDay,
  departure,
  returnDate,
  yearMonth,
  onClear,
}: {
  activeDay: SelectedDay | null;
  departure: { date: string; entry: DailyPriceEntry } | null;
  returnDate: { date: string; entry: DailyPriceEntry } | null;
  yearMonth: string;
  onClear: () => void;
}) {
  const isRangeComplete = departure && returnDate;
  const displayDay = activeDay || (departure ? { day: dayjs(departure.date).date(), outbound: departure.entry, inbound: undefined } : null);

  const totalPriceTrend = useMemo(() => {
    if (!departure || !returnDate) return null;

    const outHistory = departure.entry.history || [];
    const inHistory = returnDate.entry.history || [];

    // collected_date 기준으로 가는편 + 오는편 가격 매칭
    const dateMap = new Map<string, { label: string; outPrice?: number; inPrice?: number }>();

    for (const h of outHistory) {
      const existing = dateMap.get(h.collected_date) ?? {};
      dateMap.set(h.collected_date, { ...existing, label: h.label, outPrice: h.price });
    }
    for (const h of inHistory) {
      const existing = dateMap.get(h.collected_date) ?? {};
      dateMap.set(h.collected_date, { ...existing, label: h.label, inPrice: h.price });
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b)) // 오래된 날짜 → 최신 순
      .map(([date, { label, outPrice, inPrice }]) => {
        if (outPrice !== undefined && inPrice !== undefined) {
          return { date, label, price: outPrice + inPrice };
        }
        return null;
      })
      .filter(Boolean) as { date: string; label: string; price: number }[];
  }, [departure, returnDate]);

  if (!displayDay && !isRangeComplete) return null;

  return (
    <div className="flex flex-col justify-center gap-4 p-4 w-full h-full max-w-full relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={isRangeComplete ? 'range' : displayDay?.day}
          className="flex flex-col gap-4"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
        >
          {/* 헤더 */}
          <div className="border-b border-border pb-3 flex justify-between items-start">
            <div className="flex flex-col">
              <p className="text-2xl font-black text-foreground tracking-tight">
                {isRangeComplete 
                  ? `${dayjs(departure.date).format('M/D')} 출발 → ${dayjs(returnDate.date).format('M/D')} 귀국`
                  : dayjs(`${yearMonth}-${String(displayDay?.day).padStart(2, '0')}`).format('M월 D일 (ddd)')
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {isRangeComplete ? '선택하신 일정의 왕복 항공권 구성' : '수집 시점별 항공권 가격 변화'}
              </p>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="선택 초기화"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HistoryCard 
              label="가는편" 
              entry={isRangeComplete ? departure.entry : displayDay?.outbound} 
              subLabel={isRangeComplete ? dayjs(departure.date).format('M/D') : undefined}
            />
            <HistoryCard 
              label="오는편" 
              entry={isRangeComplete ? returnDate.entry : displayDay?.inbound} 
              subLabel={isRangeComplete ? dayjs(returnDate.date).format('M/D') : undefined}
            />
          </div>

          {isRangeComplete && totalPriceTrend && totalPriceTrend.length > 1 && (
            <div className="rounded-xl p-3 border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">왕복 합계 추이</span>
                <span className="text-[10px] font-black text-emerald-600">
                  {totalPriceTrend.length}일치 기록
                </span>
              </div>
              <div className="h-[120px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={totalPriceTrend} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(v) => dayjs(v).format('M/D')}
                    />
                    <YAxis
                      hide
                      domain={[
                        (dataMin: number) => Math.floor(dataMin * 0.975),
                        (dataMax: number) => Math.ceil(dataMax * 1.025),
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 10, borderRadius: 8, padding: '4px 8px' }}
                      formatter={(v) => [`${Number(v).toLocaleString()}원`, '왕복 합계']}
                      labelFormatter={(v) => dayjs(String(v)).format('M월 D일')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {(isRangeComplete || (displayDay?.outbound && displayDay?.inbound)) && (
            <div className="flex items-center justify-between rounded-xl px-5 py-3.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm">
              <div className="flex flex-col">
                <span className="text-sm font-bold opacity-80">왕복 합계</span>
                {isRangeComplete && <span className="text-[10px] opacity-50">{dayjs(returnDate.date).diff(dayjs(departure.date), 'day')}박 일정</span>}
              </div>
              <span className="text-2xl font-black">
                {isRangeComplete 
                  ? (departure.entry.price + returnDate.entry.price).toLocaleString()
                  : ((displayDay?.outbound?.price || 0) + (displayDay?.inbound?.price || 0)).toLocaleString()
                }원
              </span>
            </div>
          )}

          {!isRangeComplete && departure && !activeDay && (
            <div className="text-center py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-pulse">귀국 날짜를 선택해주세요</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HistoryCard({
  label,
  entry,
  subLabel,
}: {
  label: string;
  entry: DailyPriceEntry | undefined;
  subLabel?: string;
}) {
  if (!entry) {
    return (
      <div className="rounded-xl p-3 text-[10px] text-muted-foreground text-center border border-dashed border-border bg-muted/20 flex flex-col justify-center min-h-[120px]">
        <span className="font-bold opacity-60">{label}</span>
        <span>데이터 없음</span>
      </div>
    );
  }

  const history = entry.history ?? [];
  // 오래된 날짜 → 최신 순으로 정렬해서 스파크라인 데이터 생성
  const sparkData = [...history]
    .sort((a, b) => a.collected_date.localeCompare(b.collected_date))
    .map((h) => ({ price: h.price, label: h.label }));

  const oldest = sparkData[0];
  const diff = oldest ? entry.price - oldest.price : 0;
  const isDown = diff < 0;
  const isUp = diff > 0;
  const lineColor = isDown ? '#10b981' : isUp ? '#f43f5e' : '#94a3b8';

  return (
    <div className="rounded-xl p-3.5 flex flex-col gap-2.5 border border-border bg-card shadow-sm">
      {/* 헤더: 편명 + 현재 가격 + 추이 뱃지 */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
            {subLabel && (
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 rounded">{subLabel}</span>
            )}
          </div>
          <span className="text-xl font-black text-foreground">{entry.price.toLocaleString()}원</span>
        </div>

        {oldest && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full',
              isDown && 'bg-emerald-50 text-emerald-600',
              isUp && 'bg-rose-50 text-rose-600',
              !isDown && !isUp && 'bg-muted text-muted-foreground',
            )}
          >
            {isDown && <TrendingDown className="size-3 shrink-0" />}
            {isUp && <TrendingUp className="size-3 shrink-0" />}
            {!isDown && !isUp && <Minus className="size-3 shrink-0" />}
            <span>
              {isDown ? `${Math.abs(diff).toLocaleString()}↓` : isUp ? `${diff.toLocaleString()}↑` : '동일'}
            </span>
          </div>
        )}
      </div>

      {/* 스파크라인 차트 (15일치, Y축 타이트 스케일) */}
      {sparkData.length > 1 && (
        <div className="h-[64px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <YAxis
                hide
                domain={[
                  (dataMin: number) => Math.floor(dataMin * 0.975),
                  (dataMax: number) => Math.ceil(dataMax * 1.025),
                ]}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              />
              <Tooltip
                contentStyle={{ fontSize: 10, borderRadius: 6, padding: '2px 8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                formatter={(v) => [`${Number(v).toLocaleString()}원`, label]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 비교 요약: oldest 레이블 기준 */}
      {oldest && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-2">
          <span>{oldest.label} {oldest.price.toLocaleString()}원</span>
          <span
            className={cn(
              'font-bold',
              isDown && 'text-emerald-600',
              isUp && 'text-rose-600',
            )}
          >
            {isDown ? '저렴해졌어요' : isUp ? '올랐어요' : '변동 없음'}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── 섹션 3: 6개월 추이 차트 ────────────────────────────────────────────────

type TrendView = 'flight' | 'hotel';

function TrendSection({ isLoading, trend }: { isLoading: boolean; trend: FlightTrend | undefined }) {
  const [trendView, setTrendView] = useState<TrendView>('flight');

  const { chartData, domain, cheapestMonth } = useMemo(() => {
    if (!trend || trend.trend_data.length === 0) {
      return { chartData: [], domain: [0, 1] as [number, number], cheapestMonth: null };
    }
    const data = trend.trend_data.map((d) => ({
      month: dayjs(d.year_month + '-01').format('M월'),
      가격: trendView === 'flight' ? d.avg_flight_price : d.avg_hotel_price,
    }));
    const prices = data.map((d) => d.가격);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = Math.max((max - min) * 0.3, 5000);
    const domainMin = Math.floor((min - pad) / 1000) * 1000;
    const domainMax = Math.ceil((max + pad) / 1000) * 1000;
    const cheap = trend.trend_data.reduce((a, b) => a.avg_flight_price < b.avg_flight_price ? a : b);
    return { chartData: data, domain: [domainMin, domainMax] as [number, number], cheapestMonth: cheap };
  }, [trend, trendView]);

  const lineColor = trendView === 'flight' ? '#3b82f6' : '#10b981';

  if (isLoading) return <Skeleton className="w-full h-80 rounded-xl" />;
  if (!trend || trend.trend_data.length === 0) return <EmptyState message="추이 정보가 없습니다." />;

  return (
    <section aria-label="6개월 가격 추이" className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-black text-foreground">6개월 가격 추이</h3>
        <div className="flex gap-1 bg-muted p-0.5 rounded-lg text-[10px]">
          <button
            onClick={() => setTrendView('flight')}
            className={cn('px-2 py-1 rounded-md transition-all', trendView === 'flight' ? 'bg-white shadow-sm font-bold' : 'text-muted-foreground')}
          >
            항공권
          </button>
          <button
            onClick={() => setTrendView('hotel')}
            className={cn('px-2 py-1 rounded-md transition-all', trendView === 'hotel' ? 'bg-white shadow-sm font-bold' : 'text-muted-foreground')}
          >
            숙박비
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex-1 flex flex-col justify-center">
        {cheapestMonth && trendView === 'flight' && (
          <div className="mb-3 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full self-start">
            최저: {dayjs(cheapestMonth.year_month + '-01').format('M월')} ({cheapestMonth.avg_flight_price.toLocaleString()}원)
          </div>
        )}
        <div className="h-[240px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                domain={domain}
                tickFormatter={(v) => `${Math.round(Number(v) / 10000)}만`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(v) => [`${Number(v).toLocaleString()}원`, trendView === 'flight' ? '항공권' : '숙박비']}
              />
              <Line type="monotone" dataKey="가격" stroke={lineColor} strokeWidth={3} dot={{ r: 4, fill: lineColor, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

// ─── 공통: 빈 상태 ────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3 text-muted-foreground">
      <AlertCircle className="size-4 shrink-0" />
      <p className="text-base font-bold">{message}</p>
    </div>
  );
}
