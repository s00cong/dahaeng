import { axiosInstance } from "./axiosInstance";
import {
  BookmarkPageSchema,
  BookmarkDetailSchema,
  CreateBookmarkRequestSchema,
} from "@/schemas/bookmark.schema";
import type { BookmarkDetail, CreateBookmarkRequest } from "@/schemas/bookmark.schema";


export interface BookmarkListParams {
  keyword?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const bookmarkApi = {
  // GET /api/bookmarks?keyword=&page=0&size=10&sort=id,desc
  getList: async ({
    keyword,
    page = 0,
    size = 10,
    sort = "id,desc",
  }: BookmarkListParams = {}) => {
    const res = await axiosInstance.get("/api/bookmarks", {
      params: { ...(keyword ? { keyword } : {}), page, size, sort },
    });
    return BookmarkPageSchema.parse(res.data);
  },

  // GET /api/bookmarks/{bookmarkId}
  // 백엔드: { id, json (CityDetail 스냅샷), currentExchange, savedAt }
  getDetail: async (bookmarkId: number): Promise<BookmarkDetail> => {
    try {
      const { data } = await axiosInstance.get(`/api/bookmarks/${bookmarkId}`);
      const json = data.json ?? {};

      // news.top3 → newsAtSaved
      const newsAtSaved = json.news?.top3
        ?.filter((n: { url?: string }) => !!n.url)
        .map((n: { title: string; url: string; description?: string; urlToImage?: string; publishedAt?: string }) => ({
          title: n.title,
          url: n.url,
          description: n.description ?? undefined,
          urlToImage: n.urlToImage ?? undefined,
          publishedAt: n.publishedAt ?? undefined,
        }));

      return BookmarkDetailSchema.parse({
        cityId: json.cityId,
        cityName: json.cityName,
        // countryName이 빈 문자열이면 danger.countryName으로 대체
        countryName: json.countryName || json.danger?.countryName || '',
        imgUrl: json.imgUrl || null,
        createdAt: data.savedAt,
        title: data.title ?? null,
        // 매칭 점수
        matchingScore: json.score?.finalScore ?? undefined,
        // 환율 (저장 당시 / 현재)
        exchangeAtSaved: {
          before: json.exchangeRate?.krwPerDisplayUnit ?? 0,
          current: data.currentExchange?.krwPerDisplayUnit ?? 0,
          currency: json.exchangeRate?.currency ?? undefined,
        },
        // 뉴스
        newsAtSaved: newsAtSaved?.length ? newsAtSaved : undefined,
        newsSummation: json.news?.summation ?? undefined,
        // 항공권 & 숙박 (저장 당시 city detail 기준)
        savedAirTicket: json.airTicketAndHotel?.airTicket ?? undefined,
        savedHotel: json.airTicketAndHotel?.hotel ?? undefined,
        // AI 추천 이유
        recommendationReason: json.recommendationReason ?? undefined,
        // 태그
        tags: json.tags?.map((t: { name: string }) => t.name) ?? undefined,
        // 하루 예상 비용 (백엔드에서 이미 KRW)
        dailyFood: json.livingCostFor1Day?.food ?? undefined,
        dailyTransport: json.livingCostFor1Day?.transportation ?? undefined,
        // 위험도
        danger: json.danger ?? undefined,
        // 관광지
        touristSpots: json.touristSpot?.map((s: { name: string; lat: number; lon: number }) => ({
          name: s.name,
          lat: s.lat,
          lon: s.lon,
        })) ?? undefined,
      });
    } catch (e) {
      throw e;
    }
  },

  // POST /api/bookmarks
  create: async (body: CreateBookmarkRequest) => {
    CreateBookmarkRequestSchema.parse(body);
    const { data } = await axiosInstance.post("/api/bookmarks", body);
    return data;
  },

  // PATCH /api/bookmarks/{bookmarkId} — 제목 수정
  updateTitle: async (bookmarkId: number, title: string): Promise<void> => {
    await axiosInstance.patch(`/api/bookmarks/${bookmarkId}`, { title });
  },

  // DELETE /api/bookmarks/{bookmarkId}
  remove: async (bookmarkId: number) => {
    const { data } = await axiosInstance.delete(`/api/bookmarks/${bookmarkId}`);
    return data as { message: string; id: number };
  },
};
