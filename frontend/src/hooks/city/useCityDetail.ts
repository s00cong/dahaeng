import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { cityApi } from '@/api/city.api';
import { queryKeys } from '@/utils/queryKeys';

/**
 * 도시 상세 조회 (모달 오픈 시 호출)
 * GET /api/city/{cityId}?recommend=true|false
 * staleTime: 5분
 * 조회 완료 시 view-history 자동 갱신
 */
export const useCityDetail = (
  cityId: number | null,
  recommend: boolean,
  options?: {
    enabled?: boolean;
    recommendParams?: {
      selectedTags: string[];
      userTotalBudget: number;
      travelDays: number;
      month: number;
      recommendId?: string;
    };
  },
) => {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: [...queryKeys.city.detail(cityId!), recommend, options?.recommendParams ?? null],
    queryFn: () => cityApi.getDetail(cityId!, recommend, options?.recommendParams),
    enabled: cityId !== null && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });

  // 조회 완료될 때마다 최근 여행지 갱신
  useEffect(() => {
    if (result.isSuccess && cityId !== null) {
      void queryClient.invalidateQueries({ queryKey: ['city', 'view-history'] });
    }
  }, [result.isSuccess, cityId, queryClient]);

  return result;
};
