import { z } from "zod";

// 북마크 목록 아이템
export const BookmarkListItemSchema = z.object({
  id: z.number(),
  cityId: z.number(),
  cityName: z.string(),
  countryName: z.string(),
  imgUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type BookmarkListItem = z.infer<typeof BookmarkListItemSchema>;

// 북마크 목록 페이지네이션 응답
export const BookmarkPageSchema = z.object({
  content: z.array(BookmarkListItemSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
});
export type BookmarkPage = z.infer<typeof BookmarkPageSchema>;

// 저장 당시 환율 스냅샷
export const ExchangeAtSavedSchema = z.object({
  before: z.number(),
  current: z.number(),
  currency: z.string().optional(),
});

// 저장 당시 뉴스 스냅샷
export const NewsAtSavedItemSchema = z.object({
  title: z.string(),
  source: z.string().optional(),
  url: z.string(),
  description: z.string().optional(),
  urlToImage: z.string().optional(),
  publishedAt: z.string().optional(),
});

// 저장 당시 항공 스냅샷
export const FlightAtSavedSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  price: z.number(),
  startDate: z.string(),
  endDate: z.string(),
});

// 위험도
export const DangerItemSchema = z.object({
  level: z.string(),
  description: z.string(),
});

export const DangerSchema = z.object({
  countryName: z.string(),
  items: z.array(DangerItemSchema),
});

// 관광지
export const TouristSpotSavedSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
});

// 북마크 상세
export const BookmarkDetailSchema = z.object({
  cityId: z.number(),
  cityName: z.string(),
  countryName: z.string(),
  imgUrl: z.string().nullable(),
  createdAt: z.string(),
  matchingScore: z.number().optional(),
  // 환율
  exchangeAtSaved: ExchangeAtSavedSchema.optional(),
  // 뉴스
  newsAtSaved: z.array(NewsAtSavedItemSchema).optional(),
  newsSummation: z.string().optional(),
  // 항공
  flightAtSaved: FlightAtSavedSchema.optional(),
  savedAirTicket: z.number().optional(),
  savedHotel: z.number().optional(),
  // AI 추천
  recommendationReason: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // 하루 예상 비용 (이미 KRW)
  dailyFood: z.number().optional(),
  dailyTransport: z.number().optional(),
  // 위험도
  danger: DangerSchema.optional(),
  // 관광지
  touristSpots: z.array(TouristSpotSavedSchema).optional(),
});
export type BookmarkDetail = z.infer<typeof BookmarkDetailSchema>;

// 북마크 생성 요청
export const CreateBookmarkRequestSchema = z.object({
  cityId: z.number(),
  json: z.unknown(),
});
export type CreateBookmarkRequest = z.infer<typeof CreateBookmarkRequestSchema>;
