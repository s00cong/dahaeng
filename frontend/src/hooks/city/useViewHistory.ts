import { useQuery } from '@tanstack/react-query';
import { cityApi } from '@/api/city.api';

/**
 * 최근 본 도시 5개
 * GET /api/city/view-history
 * staleTime: 1분 (탭 전환 시 최신 반영)
 */
export function useViewHistory() {
  return useQuery({
    queryKey: ['city', 'view-history'],
    queryFn: () => cityApi.getViewHistory(),
    staleTime: 60 * 1000,
  });
}
