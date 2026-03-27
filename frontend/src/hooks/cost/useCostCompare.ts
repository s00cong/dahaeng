import { useQuery } from '@tanstack/react-query';
import { costApi, SEOUL_CITY_ID } from '@/api/cost.api';
import { queryKeys } from '@/utils/queryKeys';

/**
 * 서울 대비 도시 물가 비교
 * GET /api/cost/compare?target_type=CITY&base_id=1&target_id={cityId}
 * staleTime: 60분
 */
export const useCostCompare = (cityId: number) =>
  useQuery({
    queryKey: queryKeys.cost.costCompare(cityId),
    queryFn: () => costApi.getCostCompare('CITY', SEOUL_CITY_ID, cityId),
    enabled: cityId > 0 && cityId !== SEOUL_CITY_ID,
    staleTime: 60 * 60 * 1000,
  });
