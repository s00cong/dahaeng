import { z } from 'zod';

// 새 API 응답 래퍼 (status/data 형식)
export const FlightApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.string(),
    data: dataSchema,
  });

// 도시 요약 (GET /api/cities/{cityId}/summary)
export const CitySummarySchema = z.object({
  city_id: z.number(),
  city_name_kr: z.string(),
  city_name_en: z.string(),
  country_name_kr: z.string(),
  city_image_url: z.string().nullable().optional(),
  avg_flight_price: z.number(),
  avg_hotel_price: z.number(),
  typical_stops_text: z.string(),
  min_duration_text: z.string(),
  peak_season_months: z.array(z.number()),
  off_season_months: z.array(z.number()),
});
export type CitySummary = z.infer<typeof CitySummarySchema>;

// 캘린더 일별 가격 — 각 날짜에 수집시점별 히스토리 포함
// (GET /api/flights/calendar/{cityId})
export const PriceHistoryEntrySchema = z.object({
  collected_date: z.string(),
  price: z.number(),
  label: z.string(), // "오늘" | "어제" | "그제" | "3일 전" | ... | "14일 전" (최대 15일치)
});
export type PriceHistoryEntry = z.infer<typeof PriceHistoryEntrySchema>;

export const DailyPriceEntrySchema = z.object({
  date: z.string(),
  price: z.number(),
  history: z.array(PriceHistoryEntrySchema).optional().default([]),
});
export type DailyPriceEntry = z.infer<typeof DailyPriceEntrySchema>;

export const FlightCalendarSchema = z.object({
  city_id: z.number(),
  year_month: z.string(),
  updated_at: z.string(),
  outbound_daily_prices: z.array(DailyPriceEntrySchema),
  inbound_daily_prices: z.array(DailyPriceEntrySchema),
});
export type FlightCalendar = z.infer<typeof FlightCalendarSchema>;

// 6개월 월별 추이 (GET /api/flights/trend/{cityId})
export const MonthTrendEntrySchema = z.object({
  year_month: z.string(),
  avg_flight_price: z.number(),
  avg_hotel_price: z.number(),
});
export const FlightTrendSchema = z.object({
  city_id: z.number(),
  trend_data: z.array(MonthTrendEntrySchema),
});
export type FlightTrend = z.infer<typeof FlightTrendSchema>;
export type MonthTrendEntry = z.infer<typeof MonthTrendEntrySchema>;
