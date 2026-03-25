import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cityApi } from "@/api/city.api";
import { useUiStore } from "@/stores/uiStore";
import { queryKeys } from "@/utils/queryKeys";

export const useRecommend = () => {
  const setRecommendResults = useUiStore((s) => s.setRecommendResults);
  const setRecommendRequest = useUiStore((s) => s.setRecommendRequest);
  const setRecommendLoading = useUiStore((s) => s.setRecommendLoading);
  const setRecommendError = useUiStore((s) => s.setRecommendError);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      selectedTags: string[];
      userTotalBudget: number;
      travelDays: number;
      month: number;
    }) => cityApi.recommend(body),
    onMutate: () => {
      setRecommendLoading(true);
      setRecommendError(false);
    },
    onSuccess: (data, variables) => {
      setRecommendResults(data.recommendations);
      const recommendParams = { ...variables, recommendId: data.recommendId };
      setRecommendRequest(recommendParams);

      // 추천 결과 도시 3개를 바로 prefetch → 클릭 시 즉시 표시
      data.recommendations.forEach(({ cityId }) => {
        queryClient.prefetchQuery({
          queryKey: [...queryKeys.city.detail(cityId), true, recommendParams],
          queryFn: () => cityApi.getDetail(cityId, true, recommendParams),
          staleTime: 5 * 60 * 1000,
        });
      });
    },
    onError: () => {
      setRecommendError(true);
    },
    onSettled: () => {
      setRecommendLoading(false);
    },
  });
};
