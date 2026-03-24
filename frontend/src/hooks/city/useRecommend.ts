import { useMutation } from "@tanstack/react-query";
import { cityApi } from "@/api/city.api";
import { useUiStore } from "@/stores/uiStore";

export const useRecommend = () => {
  const setRecommendResults = useUiStore((s) => s.setRecommendResults);
  const setRecommendRequest = useUiStore((s) => s.setRecommendRequest);
  const setRecommendLoading = useUiStore((s) => s.setRecommendLoading);
  return useMutation({
    mutationFn: (body: {
      selectedTags: string[];
      userTotalBudget: number;
      travelDays: number;
      month: number;
    }) => cityApi.recommend(body),
    onMutate: () => {
      setRecommendLoading(true);
    },
    onSuccess: (data, variables) => {
      setRecommendResults(data.recommendations);
      setRecommendRequest({ ...variables, recommendId: data.recommendId });
    },
    onSettled: () => {
      setRecommendLoading(false);
    },
  });
};
