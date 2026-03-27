import { useQuery } from '@tanstack/react-query';
import { flightApi } from '@/api/flight.api';
import { queryKeys } from '@/utils/queryKeys';

/**
 * 6개월 월별 가격 추이 (avg_flight_price + avg_hotel_price)
 * GET /api/flights/trend/{cityId}
 * staleTime: 10분
 */
export const useFlightTrend = (cityId: number | null) =>
  useQuery({
    queryKey: queryKeys.flight.trend(cityId!),
    queryFn: () => flightApi.getFlightTrend(cityId!),
    enabled: cityId !== null,
    staleTime: 10 * 60 * 1000,
  });
