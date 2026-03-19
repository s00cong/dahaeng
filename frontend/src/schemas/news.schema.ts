import { z } from 'zod';

export const NewsItemSchema = z.object({
  id: z.number().optional(),
  title: z.string(),
  source: z.string(),
  url: z.string().url(),
  publishedAt: z.string().optional(),
  summary: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

export const CountryNewsSchema = z.array(NewsItemSchema);
export type CountryNews = z.infer<typeof CountryNewsSchema>;
