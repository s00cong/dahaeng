import { useQueries } from '@tanstack/react-query';
import { useCityList } from '@/hooks/city/useCityList';
import { flightApi } from '@/api/flight.api';

/**
 * 국가에 속한 도시들의 숙박비(avg_hotel_price) 평균을 반환
 * - 전체 도시 목록에서 countryName으로 필터링
 * - 최대 5개 도시 flight trend 병렬 조회 → avg_hotel_price 평균 / 2 (1인 기준)
 */
export function useCountryHotelAvg(countryName: string | null): number | undefined {
  const { data: cities } = useCityList();

  const cityIds = countryName
    ? (cities ?? [])
        .filter((c) => c.countryName === countryName)
        .slice(0, 5)
        .map((c) => c.cityId)
    : [];

  const trendResults = useQueries({
    queries: cityIds.map((cityId) => ({
      queryKey: ['flight', 'trend', cityId],
      queryFn: () => flightApi.getFlightTrend(cityId),
      staleTime: 10 * 60 * 1000,
    })),
  });

  if (cityIds.length === 0) return undefined;

  const hotelPrices: number[] = [];
  for (const result of trendResults) {
    if (result.data?.trend_data?.length) {
      const avg =
        result.data.trend_data.reduce((sum, t) => sum + t.avg_hotel_price, 0) /
        result.data.trend_data.length;
      hotelPrices.push(avg);
    }
  }

  if (hotelPrices.length === 0) return undefined;

  // 도시별 평균의 평균 / 2 (1인 기준)
  return Math.round(
    hotelPrices.reduce((sum, p) => sum + p, 0) / hotelPrices.length / 2,
  );
}
