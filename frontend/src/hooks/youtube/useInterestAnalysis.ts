import { useQuery } from "@tanstack/react-query";
import { youtubeApi } from "@/api/youtube.api";

export const INTEREST_ANALYSIS_QUERY_KEY = ["interest", "analysis"] as const;

export const useInterestAnalysis = () =>
  useQuery({
    queryKey: INTEREST_ANALYSIS_QUERY_KEY,
    queryFn: youtubeApi.getInterestAnalysis,
    staleTime: 5 * 60 * 1000,
  });
