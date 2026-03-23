import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { bookmarkApi } from "@/api/bookmark.api";
import { queryKeys } from "@/utils/queryKeys";
import { useUiStore } from "@/stores/uiStore";
import type { CreateBookmarkRequest } from "@/schemas/bookmark.schema";

/**
 * 북마크 생성
 * POST /api/bookmarks
 */
export const useCreateBookmark = () => {
  const queryClient = useQueryClient();
  const addBookmarkedCity = useUiStore((s) => s.addBookmarkedCity);

  return useMutation({
    mutationFn: (body: CreateBookmarkRequest) => bookmarkApi.create(body),
    onSuccess: (data, variables) => {
      toast.success(data.message);
      addBookmarkedCity(variables.cityId);
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmark.all });
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 400) {
        toast.error("이미 북마크된 도시입니다. 다른 조건으로 검색해주세요.");
      } else {
        toast.error("북마크 저장에 실패했습니다.");
      }
    },
  });
};
