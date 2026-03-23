import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookmarkApi } from '@/api/bookmark.api';
import { queryKeys } from '@/utils/queryKeys';

export const useUpdateBookmarkTitle = (bookmarkId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) => bookmarkApi.updateTitle(bookmarkId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmark.detail(bookmarkId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmark.all });
    },
    onError: () => {
      toast.error('제목 수정에 실패했습니다.');
    },
  });
};
