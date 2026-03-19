import { axiosInstance } from "./axiosInstance";
import type { CityDetail } from "@/schemas/city.schema";
import { z } from "zod";
import {
  DUMMY_CITY_DETAIL_RECOMMEND,
  DUMMY_CITY_DETAIL_NOT_RECOMMEND,
  DUMMY_NEWS_ARTICLES,
} from "@/data/city.dummy";

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
  expectedBudgetFor1day: z.number().nullable(),
  danger: BackendCountryDangerSchema,
  lat: z.number().nullable(),
  lon: z.number().nullable(),
});

// danger 문자열에서 riskLevel 파생
const dangerToRiskLevel = (
  danger:
    | { countryName: string; items: { level: string; description: string }[] }
    | null
    | undefined,
): number => {
  if (!danger || danger.items.length === 0) return 1;
  const levels = danger.items.map((item) => item.level);
  if (levels.some((l) => l.includes("자제"))) return 4;
  if (levels.some((l) => l.includes("주의"))) return 3;
  if (levels.some((l) => l.includes("유의"))) return 2;
  return 1;
};

const BackendLivingCostSchema = z.object({
  food: z.number(),
  transportation: z.number(),
  accommodation: z.number().nullable().optional(),
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
  description: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  snsLink: z.string().nullable().optional(),
  websiteLink: z.string().nullable().optional(),
  spotScore: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),           // string[]
  tagScores: z.record(z.string(), z.number()).optional(), // { "태그명": score }
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
  tags: z.array(BackendTagResponseSchema).optional(),
  touristSpot: z.array(BackendTouristSpotSchema).optional(),
  exchangeRate: BackendExchangeRateSchema,
});

// GET /api/city/{id}?recommend=false → NotRecommendCityDetailResponse
const BackendNotRecommendDetailSchema = z.object({
  id: z.number().nullable().optional(),
  name: z.string(),
  livingCostFor1Day: BackendLivingCostSchema.nullable().optional(),
  airTicketAndHotel: BackendAirTicketSchema.nullable().optional(),  // 백엔드 키: airTicketAndHotel
  danger: BackendCountryDangerSchema,
  tags: z.array(BackendTagResponseSchema).optional(),
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
        estimatedBudget: (city.expectedBudgetFor1day ?? 0) * 7,
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
      userDailyBudget: number;
      travelDays: number;
      month: number;
    },
  ): Promise<CityDetail> => {
    try {
    const { data } = await axiosInstance.get(`/api/city/${cityId}`, {
      params: recommend && recommendParams
        ? { recommend, ...recommendParams }
        : { recommend },
      timeout: recommend ? 60_000 : 10_000,
    });

    if (recommend) {
      const city = BackendRecommendDetailSchema.parse(data);
      return {
        cityId,
        cityName: city.name,
        countryId: 0,
        countryName: "",
        imgUrl: "",
        latitude: 0,
        longitude: 0,
        score: city.score ?? undefined,
        recommendationReason: city.recommendationReason ?? undefined,
        livingCostFor1Day: city.livingCostFor1Day ?? undefined,
        airTicketAndHotel: city.airTicketAndHotel ?? undefined,
        news: city.news?.top3?.length
          ? city.news
          : { summation: undefined, top3: DUMMY_NEWS_ARTICLES },
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
        imgUrl: "",
        latitude: 0,
        longitude: 0,
        livingCostFor1Day: city.livingCostFor1Day ?? undefined,
        // not-recommend는 airTicket 키 사용
        airTicketAndHotel: city.airTicketAndHotel ?? undefined,
        danger: city.danger ?? undefined,
        tags: city.tags,
        exchangeRate: city.exchangeRate ?? undefined,
      };
    }
    } catch {
      // 외부 API(News API, OpenAI, Google Places) 장애 또는 개발 환경에서 더미 데이터 반환
      const dummy = recommend ? DUMMY_CITY_DETAIL_RECOMMEND : DUMMY_CITY_DETAIL_NOT_RECOMMEND;
      return { ...dummy, cityId };
    }
  },

  // POST /api/recommend → RecommendCitySummaryResponse
  recommend: async (body: {
    selectedTags: string[];
    userDailyBudget: number;
    travelDays: number;
    month: number;
  }) => {
    const BackendRecommendResponseSchema = z.object({
      requestContext: z.object({
        selectedTags: z.array(z.string()),
        userDailyBudget: z.number(),
        travelDays: z.number(),
        month: z.number(),
      }).optional(),
      recommendations: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          imgUrl: z.string().nullable().optional(),
          expectedBudgetFor1day: z.number().nullable().optional(),
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
    return parsed.recommendations.map((item, index) => ({
      rank: index + 1,
      country: item.danger?.countryName ?? "",
      city: item.name,
      totalScore: item.scores?.total ?? 0,
      reason: null,
    }));
  },
};
