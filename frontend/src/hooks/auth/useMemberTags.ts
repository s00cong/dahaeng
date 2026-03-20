import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";

export const MEMBER_TAGS_QUERY_KEY = ["member", "tags"] as const;

export const useMemberTags = () =>
  useQuery({
    queryKey: MEMBER_TAGS_QUERY_KEY,
    queryFn: authApi.getMemberTags,
    staleTime: 0, // 항상 최신 데이터 사용
  });
