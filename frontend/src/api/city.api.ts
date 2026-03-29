import { axiosInstance } from "./axiosInstance";
import type { CityDetail } from "@/schemas/city.schema";
import { z } from "zod";

// ── 최근 본 도시 ────────────────────────────────────────────────────────────
export const ViewHistoryItemSchema = z.object({
  cityId: z.number(),
  cityName: z.string(),
  countryName: z.string(),
  dailyBudget: z.number(),
  imgUrl: z.string().nullable(),
  lastViewTime: z.string(),
});
export type ViewHistoryItem = z.infer<typeof ViewHistoryItemSchema>;

// 백엔드 CountryDanger { level, description }
const BackendCountryDangerItemSchema = z.object({
  level: z.string(),
  description: z.string().nullable(),
});

// 백엔드 CountryDangerResponse { countryName, items }
const BackendCountryDangerSchema = z
  .object({
    countryName: z.string(),
    items: z.array(BackendCountryDangerItemSchema),
  })
  .nullable()
  .optional();

// GET /api/city → AllCitiesResponse
const BackendCitySchema = z.object({
  id: z.number(),
  name: z.string(),
  imgUrl: z.string().nullable(),
  livingCostFor1Day: z.number().nullable().optional(),
  danger: BackendCountryDangerSchema,
  lat: z.number().nullable(),
  lon: z.number().nullable(),
});

// danger 문자열에서 riskLevel 파생
const dangerToRiskLevel = (
  danger:
    | { countryName: string; items: { level: string; description: string | null }[] }
    | null
    | undefined,
): number => {
  if (!danger || danger.items.length === 0) return 0;
  // 철수권고(일부)·여행금지(일부)는 오버레이로 처리 → 베이스 계산에서 제외
  const levels = danger.items
    .filter((item) => {
      const l = item.level;
      if (l.includes("(일부)") && (l.includes("철수") || l.includes("금지"))) return false;
      return true;
    })
    .map((item) => item.level);
  if (levels.length === 0) return 0;
  if (levels.some((l) => l.includes("금지"))) return 6;
  if (levels.some((l) => l.includes("철수"))) return 5;
  if (levels.some((l) => l.includes("자제"))) return 4;
  if (levels.some((l) => l.includes("주의"))) return 3;
  if (levels.some((l) => l.includes("유의"))) return 2;
  return 1;
};

const BackendFoodDetailSchema = z.object({
  total: z.number(),
  breakfast: z.number().nullable().optional(),
  lunch: z.number().nullable().optional(),
  dinner: z.number().nullable().optional(),
  cappuccino: z.number().nullable().optional(),
  cokePepsi: z.number().nullable().optional(),
});

const BackendTransportDetailSchema = z.object({
  total: z.number(),
  localTransportTicket: z.number().nullable().optional(),
  ticketCount: z.number().nullable().optional(),
});

const BackendLivingCostSchema = z.object({
  food: z.union([z.number(), BackendFoodDetailSchema]),
  transportation: z.union([z.number(), BackendTransportDetailSchema]),
  accommodation: z.number().nullable().optional(),
  hotel: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
});

// recommend=true 응답의 airTicketAndHotel
const BackendAirTicketAndHotelSchema = z.object({
  airTicket: z.number(),
  hotel: z.number(),
});

// recommend=false 응답의 airTicket
const BackendAirTicketSchema = z.object({
  airTicket: z.number(),
  hotel: z.number(),
});

const BackendTagResponseSchema = z.object({
  name: z.string(),
  tagScore: z.number().nullable().optional(),
});

const BackendNewsItemSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  urlToImage: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});


// 환율 (선택 제공) — 백엔드: { currency, krwPerDisplayUnit, eventDate }
const BackendExchangeRateSchema = z.object({
  currency: z.string(),
  krwPerDisplayUnit: z.number(),
  eventDate: z.string().optional(),
  displayUnit: z.number().optional(),
  displaySymbol: z.string().optional(),
}).nullable().optional();

// 백엔드 touristSpot: tags는 string[], tagScores는 Record<string, number>
const BackendTouristSpotSchema = z.object({
  name: z.string(),
  koName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  spotScore: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
  tagScores: z.record(z.string(), z.number()).optional(),
});

// touristSpot 변환: string[] tags + tagScores → Tag[]
function convertSpotTags(spot: {
  tags?: string[];
  tagScores?: Record<string, number>;
  [key: string]: unknown;
}) {
  return spot.tags?.map((name) => ({
    name,
    tagScore: spot.tagScores?.[name] ?? null,
  }));
}

// GET /api/city/{id}?recommend=true → RecommendCityDetailResponse
const BackendRecommendDetailSchema = z.object({
  name: z.string(),
  score: z
    .object({
      finalScore: z.number().nullable().optional(),
      budgetScore: z.number().nullable().optional(),
      safetyScore: z.number().nullable().optional(),
      tagMatchScore: z.number().nullable().optional(),
      newPenaltyScore: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  recommendationReason: z.string().nullable().optional(),
  livingCostFor1Day: BackendLivingCostSchema.nullable().optional(),
  airTicketAndHotel: BackendAirTicketAndHotelSchema.nullable().optional(),
  news: z
    .object({
      summation: z.string().nullable().optional(),
      top3: z.array(BackendNewsItemSchema).optional(),
    })
    .nullable()
    .optional(),
  danger: BackendCountryDangerSchema,
  tags: z.array(BackendTagResponseSchema).optional().catch([]),
  touristSpot: z.array(BackendTouristSpotSchema).optional().catch([]),
  exchangeRate: BackendExchangeRateSchema,
});

// GET /api/city/{id}?recommend=false → NotRecommendCityDetailResponse
const BackendNotRecommendDetailSchema = z.object({
  id: z.number().nullable().optional(),
  name: z.string(),
  imgUrl: z.string().nullable().optional(),
  livingCostFor1Day: BackendLivingCostSchema.nullable().optional(),
  airTicketAndHotel: BackendAirTicketSchema.nullable().optional(),  // 백엔드 키: airTicketAndHotel
  danger: BackendCountryDangerSchema,
  tags: z.array(BackendTagResponseSchema).optional().catch([]),
  exchangeRate: BackendExchangeRateSchema,
});

export const cityApi = {
  // GET /api/city
  getList: async (params?: { lat?: number; lng?: number; query?: string }) => {
    const { data } = await axiosInstance.get("/api/city", { params });
    return z
      .array(BackendCitySchema)
      .parse(data)
      .map((city) => ({
        cityId: city.id,
        cityName: city.name,
        countryName: city.danger?.countryName ?? "",
        imgUrl: city.imgUrl ?? "",
        estimatedBudget: (city.livingCostFor1Day ?? 0) * 7,
        riskLevel: dangerToRiskLevel(city.danger),
        latitude: city.lat ?? 0,
        longitude: city.lon ?? 0,
        matchingScore: undefined,
      }));
  },

  // GET /api/city/{cityId}?recommend=true|false
  getDetail: async (
    cityId: number,
    recommend: boolean,
    recommendParams?: {
      selectedTags: string[];
      userTotalBudget: number;
      travelDays: number;
      month: number;
      recommendId?: string;
    },
  ): Promise<CityDetail> => {
    try {
    const { data } = await axiosInstance.get(`/api/city/${cityId}`, {
      params: recommend && recommendParams
        ? { recommend, selectedTags: recommendParams.selectedTags, userTotalBudget: recommendParams.userTotalBudget, travelDays: recommendParams.travelDays, month: recommendParams.month, recommendId: recommendParams.recommendId }
        : { recommend },
      timeout: recommend ? 60_000 : 10_000,
    });

    if (recommend) {
      const city = BackendRecommendDetailSchema.parse(data);
      return {
        cityId,
        recommendId: recommendParams?.recommendId,
        cityName: city.name,
        countryId: 0,
        countryName: "",
        imgUrl: "",
        latitude: 0,
        longitude: 0,
        score: city.score ?? undefined,
        recommendationReason: city.recommendationReason ?? undefined,
        livingCostFor1Day: city.livingCostFor1Day ? {
          food: typeof city.livingCostFor1Day.food === 'number' ? city.livingCostFor1Day.food : city.livingCostFor1Day.food.total,
          transportation: typeof city.livingCostFor1Day.transportation === 'number' ? city.livingCostFor1Day.transportation : city.livingCostFor1Day.transportation.total,
          accommodation: city.livingCostFor1Day.hotel ?? city.livingCostFor1Day.accommodation ?? undefined,
          total: city.livingCostFor1Day.total ?? undefined,
        } : undefined,
        airTicketAndHotel: city.airTicketAndHotel ?? undefined,
        news: city.news ?? undefined,
        danger: city.danger ?? undefined,
        tags: city.tags,
        // tags(string[]) + tagScores({}) → Tag[] 변환
        touristSpot: city.touristSpot?.map((spot) => ({
          ...spot,
          tags: convertSpotTags(spot),
        })),
        exchangeRate: city.exchangeRate ?? undefined,
      };
    } else {
      const city = BackendNotRecommendDetailSchema.parse(data);
      return {
        cityId,
        cityName: city.name,
        countryId: 0,
        countryName: "",
        imgUrl: city.imgUrl ?? "",
        latitude: 0,
        longitude: 0,
        livingCostFor1Day: city.livingCostFor1Day ? {
          food: typeof city.livingCostFor1Day.food === 'number' ? city.livingCostFor1Day.food : city.livingCostFor1Day.food.total,
          transportation: typeof city.livingCostFor1Day.transportation === 'number' ? city.livingCostFor1Day.transportation : city.livingCostFor1Day.transportation.total,
          accommodation: city.livingCostFor1Day.hotel ?? city.livingCostFor1Day.accommodation ?? undefined,
          total: city.livingCostFor1Day.total ?? undefined,
        } : undefined,
        // not-recommend는 airTicket 키 사용
        airTicketAndHotel: city.airTicketAndHotel ?? undefined,
        danger: city.danger ?? undefined,
        tags: city.tags,
        exchangeRate: city.exchangeRate ?? undefined,
      };
    }
    } catch (e) {
      // recommend=true 실패 시 throw → aiCity=undefined → basicCity(실제 데이터) 사용
      // recommend=false 실패 시에도 throw → TanStack Query isError 처리
      throw e;
    }
  },

  // POST /api/recommend → RecommendCitySummaryResponse
  recommend: async (body: {
    selectedTags: string[];
    userTotalBudget: number;
    travelDays: number;
    month: number;
  }) => {
    const BackendRecommendResponseSchema = z.object({
      recommendId: z.string().nullable().optional(),
      requestContext: z.object({
        selectedTags: z.array(z.string()),
        userTotalBudget: z.number(),
        travelDays: z.number(),
        month: z.number(),
      }).optional(),
      recommendations: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          imgUrl: z.string().nullable().optional(),
          livingCostFor1Day: z.number().nullable().optional(),
          scores: z.object({
            total: z.number().nullable().optional(),
            tag: z.number().nullable().optional(),
            budget: z.number().nullable().optional(),
            safety: z.number().nullable().optional(),
            newsPenalty: z.number().nullable().optional(),
          }).nullable().optional(),
          danger: BackendCountryDangerSchema,
          lat: z.number().nullable().optional(),
          lon: z.number().nullable().optional(),
        }),
      ),
    });
    const { data } = await axiosInstance.post("/api/recommend", body);
    const parsed = BackendRecommendResponseSchema.parse(data);
    return {
      recommendId: parsed.recommendId ?? undefined,
      recommendations: parsed.recommendations.map((item, index) => ({
        rank: index + 1,
        cityId: item.id,
        country: item.danger?.countryName ?? "",
        city: item.name,
        totalScore: item.scores?.total ?? 0,
        reason: null,
      })),
    };
  },

  // GET /api/city/view-history
  getViewHistory: async (): Promise<ViewHistoryItem[]> => {
    const { data } = await axiosInstance.get("/api/city/view-history");
    return z.array(ViewHistoryItemSchema).parse(data);
  },
};
