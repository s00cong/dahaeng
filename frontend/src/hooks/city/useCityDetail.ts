import { useQuery } from '@tanstack/react-query';
import { cityApi } from '@/api/city.api';
import { queryKeys } from '@/utils/queryKeys';

/**
 * 도시 상세 조회 (모달 오픈 시 호출)
 * GET /api/city/{cityId}?recommend=true|false
 * staleTime: 5분
 */
export const useCityDetail = (
  cityId: number | null,
  recommend: boolean,
  options?: {
    enabled?: boolean;
    recommendParams?: {
      selectedTags: string[];
      userDailyBudget: number;
      travelDays: number;
      month: number;
    };
  },
) =>
  useQuery({
    queryKey: [...queryKeys.city.detail(cityId!), recommend, options?.recommendParams ?? null],
    queryFn: () => cityApi.getDetail(cityId!, recommend, options?.recommendParams),
    enabled: cityId !== null && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });