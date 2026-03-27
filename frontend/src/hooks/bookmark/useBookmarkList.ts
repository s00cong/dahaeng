import { useQuery } from "@tanstack/react-query";
import { bookmarkApi } from "@/api/bookmark.api";
import type { BookmarkListParams } from "@/api/bookmark.api";
import { queryKeys } from "@/utils/queryKeys";

/**
 * 북마크 목록 조회
 * GET /api/bookmarks?keyword=&page=0&size=10&sort=id,desc
 */
export const useBookmarkList = (params: BookmarkListParams = {}) =>
  useQuery({
    queryKey: queryKeys.bookmark.list(params.keyword, params.page, params.size),
    queryFn: () => bookmarkApi.getList(params),
    staleTime: 0,
  });
