import { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { Route } from '@/routes/_authenticated/cost.$countryId';
import { ChevronRight, AlertCircle, Globe } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCostDetail } from '@/hooks/cost/useCostDetail';
import { costApi, SEOUL_CITY_ID } from '@/api/cost.api';
import { useQuery } from '@tanstack/react-query';
import { SalaryPopulationSection } from '@/components/cost/SalaryPopulationSection';
import { SeoulCompareSection } from '@/components/cost/SeoulCompareSection';
import { CostDetailTable } from '@/components/cost/CostDetailTable';
import { ExchangeRateCombinedSection } from '@/components/cost/ExchangeRateCombinedSection';
import { useCostDetail as useSeoulDetail } from '@/hooks/cost/useCostDetail';
import { useFlightTrend } from '@/hooks/flight/useFlightTrend';
import { useCityDetail } from '@/hooks/city/useCityDetail';
import { useExchangeRateNew } from '@/hooks/cost/useExchangeRateNew';

// ─── 애니메이션 ───────────────────────────────────────────────────
const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── 도시 히어로 ──────────────────────────────────────────────────
function CityHeroSection({
  name,
  imgUrl,
  currency,
  parentRegion,
}: {
  name: string;
  imgUrl: string | null | undefined;
  currency: string;
  parentRegion?: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-800">
      {imgUrl && !imgError ? (
        <img
          src={imgUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Globe className="size-16 text-slate-500" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className="absolute bottom-5 left-6">
        {parentRegion && (
          <p className="text-white/70 text-sm mb-1">{parentRegion}</p>
        )}
        <h1 className="text-3xl font-bold text-white">{name}</h1>
        <Badge className="mt-2 bg-white/20 text-white border-white/30 text-xs">
          {currency}
        </Badge>
      </div>
    </div>
  );
}

// ─── 에러 상태 ────────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center" role="alert">
      <div className="p-4 rounded-full bg-red-50">
        <AlertCircle className="size-8 text-red-500" />
      </div>
      <div>
        <p className="font-semibold text-foreground">데이터를 불러오지 못했습니다</p>
        <p className="text-sm text-muted-foreground mt-1">잠시 후 다시 시도해 주세요</p>
      </div>
      <Button variant="outline" onClick={onRetry}>다시 시도</Button>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────
const CountryCostDetailPage = () => {
  const { countryId: idParam } = useParams({ from: '/_authenticated/cost/$countryId' });
  const { targetType } = Route.useSearch();
  const targetId = Number(idParam);

  const { data, isLoading, isError, refetch } = useCostDetail(targetType, targetId);

  // 서울 대비 비교
  const compareTargetType = targetType === 'country' ? 'COUNTRY' : 'CITY';
  const { data: compareData, isLoading: isCompareLoading } = useQuery({
    queryKey: ['cost', 'compare', compareTargetType, targetId],
    queryFn: () => costApi.getCostCompare(compareTargetType, SEOUL_CITY_ID, targetId),
    enabled: targetId > 0 && targetId !== SEOUL_CITY_ID,
    staleTime: 60 * 60 * 1000,
  });

  // 서울 생활비 (비교 테이블용)
  const { data: seoulDetail } = useSeoulDetail('city', SEOUL_CITY_ID);

  // city 타입일 때 city API 추가 호출 → exchangeRate.currency 획득
  const { data: cityDetail } = useCityDetail(
    targetType === 'city' ? targetId : null,
    false,
  );
  const foreignCurrency = cityDetail?.exchangeRate?.currency ?? null;
  const { data: exchangeRateData, isLoading: isExchangeLoading } = useExchangeRateNew(foreignCurrency ?? '');

  // 6개월 항공 추이 → avg_hotel_price 평균 / 2 (city 타입일 때만)
  const { data: flightTrend } = useFlightTrend(targetType === 'city' ? targetId : null);
  const avgHotelPerDay = flightTrend?.trend_data?.length
    ? Math.round(
        flightTrend.trend_data.reduce((sum, t) => sum + t.avg_hotel_price, 0) /
        flightTrend.trend_data.length / 2,
      )
    : undefined;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-slate-50"
    >
      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* ── 브레드크럼 ──────────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6" aria-label="페이지 경로">
          <Link to="/main" className="hover:text-foreground transition-colors no-underline">홈</Link>
          <ChevronRight className="size-3.5" />
          <Link to="/cost" className="hover:text-foreground transition-colors no-underline">글로벌 물가</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{data?.target.name ?? `#${targetId}`}</span>
        </nav>

        {/* ── 로딩 ─────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        )}

        {/* ── 에러 ─────────────────────────────────────────────────── */}
        {isError && !data && (
          <ErrorState onRetry={() => void refetch()} />
        )}

        {/* ── 데이터 ───────────────────────────────────────────────── */}
        {data && (
          <div className="flex flex-col gap-6">

            {/* A. 도시/국가 히어로 */}
            <CityHeroSection
              name={data.target.name}
              imgUrl={data.target.img_url}
              currency={data.target.currency}
              parentRegion={data.target.parentRegion}
            />

            {/* B. 환율 정보 — city 타입이고 외화 코드가 있을 때만 */}
            {foreignCurrency && (
              <section aria-label="환율 정보">
                <ExchangeRateCombinedSection
                  currency={foreignCurrency}
                  exchangeRateData={exchangeRateData}
                  isLoading={isExchangeLoading}
                />
              </section>
            )}

            {/* C. 세후 월급 + 인구 */}
            <section aria-label="급여 및 인구">
              <SalaryPopulationSection
                livingCost={data.living_cost}
                isLoading={isLoading}
              />
            </section>

            {/* C. 서울 대비 비교 */}
            {targetId !== SEOUL_CITY_ID && (
              <section aria-label="서울 대비 물가 비교">
                <SeoulCompareSection
                  data={compareData}
                  isLoading={isCompareLoading}
                  hotelPerDay={avgHotelPerDay}
                />
              </section>
            )}

            {/* D. 전체 물가 상세표 — 백엔드가 KRW 환산값으로 내려주므로 krwPerTarget 불필요 */}
            <section aria-label="전체 물가 상세">
              <CostDetailTable
                data={data}
                isLoading={isLoading}
                seoulLivingCost={seoulDetail?.living_cost}
              />
            </section>

          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CountryCostDetailPage;
