import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookmarkApi } from '@/api/bookmark.api';
import { queryKeys } from '@/utils/queryKeys';
import type { BookmarkDetail, BookmarkListItem } from '@/schemas/bookmark.schema';

export const useUpdateBookmarkTitle = (bookmarkId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) => bookmarkApi.updateTitle(bookmarkId, title),
    onSuccess: (updated) => {
      // 상세 캐시 직접 교체
      queryClient.setQueryData<BookmarkDetail>(
        queryKeys.bookmark.detail(bookmarkId),
        updated,
      );
      // 목록 캐시 title 직접 업데이트
      queryClient.setQueriesData<{ content: BookmarkListItem[] }>(
        { queryKey: queryKeys.bookmark.all },
        (prev) => {
          if (!prev?.content) return prev;
          return {
            ...prev,
            content: prev.content.map((item) =>
              item.id === bookmarkId ? { ...item, title: updated.title ?? item.title } : item,
            ),
          };
        },
      );
    },
    onError: () => {
      toast.error('제목 수정에 실패했습니다.');
    },
  });
};
