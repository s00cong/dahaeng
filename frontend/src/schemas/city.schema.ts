import { z } from "zod";

// ── CityListItem: GET /api/city (AllCitiesResponse) 매핑 결과 ──────────────
// 백엔드: { id, name, countryName, imgUrl, expectedBudgetFor1day, danger(object), lat, lon }
// api.ts에서 id→cityId, name→cityName, lat→latitude, lon→longitude, expectedBudgetFor1day→estimatedBudget 변환
export const CityListItemSchema = z.object({
  cityId: z.number(),
  cityName: z.string(),
  countryName: z.string(),
  imgUrl: z.string(),
  estimatedBudget: z.number(),
  riskLevel: z.number().min(0).max(6), // danger object에서 파생
  latitude: z.number(),
  longitude: z.number(),
  matchingScore: z.number().min(0).max(100).optional(),
});
export type CityListItem = z.infer<typeof CityListItemSchema>;

// ── CountryDanger: 백엔드 CountryDanger { level, description } ────────────
export const CountryDangerItemSchema = z.object({
  level: z.string(),
  description: z.string().nullable(),
});

// ── CountryDangerResponse: 백엔드 { countryName, items } ──────────────────
export const CountryDangerSchema = z.object({
  countryName: z.string(),
  items: z.array(CountryDangerItemSchema),
});
export type CountryDanger = z.infer<typeof CountryDangerSchema>;

// ── Score: 백엔드 Score { finalScore, budgetScore, safetyScore, tagMatchScore, newPenaltyScore } ──
export const CityScoreSchema = z.object({
  finalScore: z.number().nullable().optional(),
  budgetScore: z.number().nullable().optional(),
  safetyScore: z.number().nullable().optional(),
  tagMatchScore: z.number().nullable().optional(),
  newPenaltyScore: z.number().nullable().optional(),
});

// ── LivingCostFor1Day: 백엔드 { food, transportation, hotel(비추천)/accommodation(추천) } ──
export const LivingCostFor1DaySchema = z.object({
  food: z.number(),
  transportation: z.number(),
  accommodation: z.number().nullable().optional(),
  hotel: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
});

// ── AirTicketAndHotel: 백엔드 { airTicket, hotel } ───────────────────────
export const AirTicketAndHotelSchema = z.object({
  airTicket: z.number(),
  hotel: z.number(),
});

// ── NewsItem: 백엔드 { title, url, content, description, urlToImage, publishedAt } ──
export const NewsItemSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  urlToImage: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

// ── News: 백엔드 { summation, top3 } ─────────────────────────────────────
export const NewsSchema = z.object({
  summation: z.string().nullable().optional(),
  top3: z.array(NewsItemSchema).optional(),
});

// ── Tag: 백엔드 { name, tagScore } ────────────────────────────────────────
export const TagSchema = z.object({
  name: z.string(),
  tagScore: z.number().nullable().optional(),
});

// ── TouristSpot: 프론트 표현 (tags는 api.ts에서 변환) ─────────────────
export const TouristSpotSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  snsLink: z.string().nullable().optional(),
  websiteLink: z.string().nullable().optional(),
  spotScore: z.number().nullable().optional(),
  // 백엔드 tags(string[]) + tagScores({name:score}) → Tag[] 로 변환
  tags: z.array(TagSchema).optional(),
});

// ── ExchangeRate: 환율 (백엔드 선택 제공) ─────────────────────────────
// 백엔드 RecommendCityDetailResponse.ExchangeRate / NotRecommendCityDetailResponse.ExchangeRate
// { currency, krwPerDisplayUnit, eventDate }
export const ExchangeRateSchema = z.object({
  currency: z.string(),
  krwPerDisplayUnit: z.number(),
  eventDate: z.string().optional(),
  displayUnit: z.number().optional(),
  displaySymbol: z.string().optional(),
});
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>;

// ── CityDetail: GET /api/city/{id}?recommend=true|false 결과 ─────────────
// cityId, countryId, countryName, imgUrl, latitude, longitude는 api.ts에서 보완
export const CityDetailSchema = z.object({
  cityId: z.number(),
  recommendId: z.string().uuid().optional(),
  cityName: z.string(),
  countryId: z.number(),
  countryName: z.string(),
  imgUrl: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  // 추천 모드 (RecommendCityDetailResponse)
  score: CityScoreSchema.nullable().optional(),
  recommendationReason: z.string().nullable().optional(),
  livingCostFor1Day: LivingCostFor1DaySchema.nullable().optional(),
  airTicketAndHotel: AirTicketAndHotelSchema.nullable().optional(),
  news: NewsSchema.nullable().optional(),
  danger: CountryDangerSchema.nullable().optional(),
  tags: z.array(TagSchema).optional(),
  touristSpot: z.array(TouristSpotSchema).optional(),
  exchangeRate: ExchangeRateSchema.nullable().optional(),
});
export type CityDetail = z.infer<typeof CityDetailSchema>;

export const RecommendRequestSchema = z.object({
  selectedTags: z.array(z.string()),
  userTotalBudget: z.number().positive(),
  travelDays: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  recommendId: z.string().uuid(),
});
export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;

export const RecommendResultItemSchema = z.object({
  rank: z.number(),
  country: z.string(),
  city: z.string(),
  totalScore: z.number(),
  reason: z.string().nullable().optional(),
});
export type RecommendResultItem = z.infer<typeof RecommendResultItemSchema>;
