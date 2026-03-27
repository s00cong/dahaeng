import { useQuery } from '@tanstack/react-query';
import { flightApi } from '@/api/flight.api';
import { queryKeys } from '@/utils/queryKeys';

/**
 * 캘린더 일별 가격 (가는편/오는편)
 * GET /api/flights/calendar/{cityId}?year_month=YYYY-MM
 * staleTime: 5분
 */
export const useFlightCalendar = (cityId: number | null, yearMonth: string) =>
  useQuery({
    queryKey: queryKeys.flight.calendar(cityId!, yearMonth),
    queryFn: () => flightApi.getFlightCalendar(cityId!, yearMonth),
    enabled: cityId !== null && !!yearMonth,
    staleTime: 5 * 60 * 1000,
  });
