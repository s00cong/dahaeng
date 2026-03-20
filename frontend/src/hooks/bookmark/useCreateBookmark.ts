import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { bookmarkApi } from "@/api/bookmark.api";
import { queryKeys } from "@/utils/queryKeys";
import type { CreateBookmarkRequest } from "@/schemas/bookmark.schema";

/**
 * 북마크 생성
 * POST /api/bookmarks
 */
export const useCreateBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateBookmarkRequest) => bookmarkApi.create(body),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmark.all });
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 400) {
        toast.error(
          "이미 저장된 도시입니다. 기존 북마크를 삭제 후 다시 저장할 수 있습니다.",
        );
      } else {
        toast.error("북마크 저장에 실패했습니다.");
      }
    },
  });
};
