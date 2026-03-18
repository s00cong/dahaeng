import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookmarkApi } from '@/api/bookmark.api';
import { queryKeys } from '@/utils/queryKeys';
import type { CreateBookmarkRequest } from '@/schemas/bookmark.schema';

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
  });
};
