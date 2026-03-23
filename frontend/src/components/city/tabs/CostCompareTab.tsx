import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ExchangeRateCombinedSection } from '@/components/cost/ExchangeRateCombinedSection';
import { CostDetailTable } from '@/components/cost/CostDetailTable';
import { SeoulCompareSection } from '@/components/cost/SeoulCompareSection';
import { SalaryPopulationSection } from '@/components/cost/SalaryPopulationSection';
import { useCityPriceTab } from '@/hooks/cost/useCityPriceTab';
import { SEOUL_CITY_ID } from '@/api/cost.api';
import { useCostDetail } from '@/hooks/cost/useCostDetail';
import { useFlightTrend } from '@/hooks/flight/useFlightTrend';
import type { CityDetail } from '@/schemas/city.schema';

interface CostCompareTabProps {
  city: CityDetail;
}

const tabVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

export function CostCompareTab({ city }: CostCompareTabProps) {
  // city.exchangeRate.currency(실제 외화 코드)를 우선 사용, 없으면 USD
  const [currency, setCurrency] = useState(city.exchangeRate?.currency ?? 'USD');

  // 통합 훅 호출 (4개 API: 상세, 비교, 환율, 추이)
  const { exchangeRate, costDetail, costCompare, isLoading, isError } = useCityPriceTab(
    city.cityId,
    currency,
  );

  // 서울 상세 정보 따로 호출 (비교 바 렌더링용)
  const seoulDetail = useCostDetail('city', SEOUL_CITY_ID);

  // 6개월 항공 추이 → avg_hotel_price 평균 / 2 (2인 기준 1인 숙박비)
  const { data: flightTrend } = useFlightTrend(city.cityId);
  const avgHotelPerDay = flightTrend?.trend_data?.length
    ? Math.round(
        flightTrend.trend_data.reduce((sum, t) => sum + t.avg_hotel_price, 0) /
        flightTrend.trend_data.length /
        2,
      )
    : undefined;

  // city가 바뀌면 currency도 재설정
  useEffect(() => {
    setCurrency(city.exchangeRate?.currency ?? 'USD');
  }, [city.cityId, city.exchangeRate?.currency]);

  if (isLoading && !costDetail.data) {
    return (
      <div className="flex h-full items-center justify-center p-20">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError && !costDetail.data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-10 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-sm text-muted-foreground">물가 정보를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`cost-tab-${city.cityId}`}
        variants={tabVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex flex-col gap-5 p-4 bg-slate-50/30 dark:bg-slate-900/10 min-h-full"
      >
        {/* A. 환율 정보 (현재 환율 2 : 환율 추이 8) */}
        <ExchangeRateCombinedSection
          currency={currency}
          exchangeRateData={exchangeRate.data}
          isLoading={exchangeRate.isLoading}
        />

        {/* B. 세후 평균 월급 및 인구 정보 */}
        <SalaryPopulationSection
          livingCost={costDetail.data?.living_cost}
          isLoading={costDetail.isLoading}
        />

        {/* C. 서울 vs 도시 물가 요약 및 비교 지표 (항목별 차이 차트 포함) */}
        <SeoulCompareSection
          data={costCompare.data}
          isLoading={costCompare.isLoading}
          hotelPerDay={avgHotelPerDay ?? city.livingCostFor1Day?.accommodation ?? undefined}
          totalWithHotel={city.livingCostFor1Day?.total ?? undefined}
        />

        {/* C. 항목별 전체 물가표 (월급, 인구 정보 포함) */}
        <CostDetailTable
          data={costDetail.data}
          isLoading={costDetail.isLoading}
          seoulLivingCost={seoulDetail.data?.living_cost}
          krwPerTarget={exchangeRate.data ? Math.round(exchangeRate.data.krw_per_1target) : undefined}
        />
      </motion.div>
    </AnimatePresence>
  );
}
