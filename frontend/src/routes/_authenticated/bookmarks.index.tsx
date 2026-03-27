import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import BookmarkListPage from '@/pages/BookmarkListPage';

const bookmarksSearchSchema = z.object({
  keyword: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/bookmarks/')({
  validateSearch: bookmarksSearchSchema,
  component: BookmarkListPage,
});
