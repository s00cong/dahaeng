import { useExchangeRateNew } from './useExchangeRateNew';
import { useExchangeRateHistory } from './useExchangeRateHistory';
import { useCostDetail } from './useCostDetail';
import { useCostCompare } from './useCostCompare';

/**
 * 도시 물가 탭 통합 훅
 * 4개 API를 병렬로 조회하고, currency는 costDetail에서 도출
 */
export function useCityPriceTab(cityId: number, currency: string) {
  const costDetail = useCostDetail('city', cityId);
  const costCompare = useCostCompare(cityId);

  // currency는 props로 전달되거나 costDetail 로드 후 상위에서 업데이트
  const exchangeRate = useExchangeRateNew(currency);
  const exchangeHistory = useExchangeRateHistory(currency, 'D');

  const isLoading =
    costDetail.isLoading ||
    costCompare.isLoading ||
    exchangeRate.isLoading ||
    exchangeHistory.isLoading;

  const isError =
    costDetail.isError &&
    costCompare.isError &&
    exchangeRate.isError &&
    exchangeHistory.isError;

  return {
    exchangeRate,
    exchangeHistory,
    costDetail,
    costCompare,
    isLoading,
    isError,
  };
}
