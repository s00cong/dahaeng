import { useQuery } from "@tanstack/react-query";
import { tagApi } from "@/api/tag.api";
import { queryKeys } from "@/utils/queryKeys";

export const useTagList = () =>
  useQuery({
    queryKey: queryKeys.tag.all,
    queryFn: tagApi.getList,
    staleTime: Infinity, // 태그 목록은 거의 변하지 않음
  });
