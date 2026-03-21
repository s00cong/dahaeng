import { useQuery } from '@tanstack/react-query';
import { costApi } from '@/api/cost.api';
import { queryKeys } from '@/utils/queryKeys';

/**
 * 환율 추이 조회
 * GET /api/exchange-rate/history?target_currency=XXX&type=D|W|M
 * staleTime: 30분
 */
export const useExchangeRateHistory = (
  targetCurrency: string,
  type: 'D' | 'W' | 'M' = 'D',
) =>
  useQuery({
    queryKey: queryKeys.cost.exchangeHistory(targetCurrency, type),
    queryFn: () => costApi.getExchangeRateHistory(targetCurrency, type),
    enabled: !!targetCurrency && targetCurrency !== 'KRW',
    staleTime: 30 * 60 * 1000,
  });
