import { useQuery } from '@tanstack/react-query';
import { costApi } from '@/api/cost.api';
import { queryKeys } from '@/utils/queryKeys';

/**
 * 현재 환율 조회 (신규 API)
 * GET /api/exchange-rate?currency=XXX
 * staleTime: 30분
 */
export const useExchangeRateNew = (currency: string) =>
  useQuery({
    queryKey: queryKeys.cost.exchangeNew(currency),
    queryFn: () => costApi.getExchangeRateNew(currency),
    enabled: !!currency && currency !== 'KRW',
    staleTime: 30 * 60 * 1000,
  });
