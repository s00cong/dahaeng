import { useQuery } from '@tanstack/react-query';
import { flightApi } from '@/api/flight.api';
import { queryKeys } from '@/utils/queryKeys';

/**
 * 도시 요약 (avg_flight_price, typical_stops_text, peak/off season 등)
 * GET /api/cities/{cityId}/summary?year_month=YYYY-MM
 * staleTime: 5분
 */
export const useCitySummary = (cityId: number | null, yearMonth: string) =>
  useQuery({
    queryKey: queryKeys.flight.citySummary(cityId!, yearMonth),
    queryFn: () => flightApi.getCitySummary(cityId!, yearMonth),
    enabled: cityId !== null && !!yearMonth,
    staleTime: 5 * 60 * 1000,
  });
