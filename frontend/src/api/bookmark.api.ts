import { axiosInstance } from "./axiosInstance";
import {
  BookmarkPageSchema,
  BookmarkDetailSchema,
  CreateBookmarkRequestSchema,
} from "@/schemas/bookmark.schema";
import type { BookmarkDetail, CreateBookmarkRequest } from "@/schemas/bookmark.schema";

const DUMMY_DETAIL: BookmarkDetail = {
  cityId: 1,
  cityName: "도쿄",
  countryName: "일본",
  imgUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
  createdAt: "2024-01-15T10:00:00",
  matchingScore: 87,
  exchangeAtSaved: { before: 850, current: 920 },
  newsAtSaved: [
    { title: "일본 벚꽃 시즌 시작, 관광객 급증", source: "NHK", url: "https://www.nhk.or.jp" },
    { title: "도쿄 지하철 요금 인상 예정", source: "Nikkei", url: "https://www.nikkei.com" },
  ],
  flightAtSaved: {
    origin: "서울(ICN)",
    destination: "도쿄(NRT)",
    price: 320000,
    startDate: "2024-04-01",
    endDate: "2024-04-07",
  },
};

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

      // news.top3 → newsAtSaved (source 없으면 undefined)
      const newsAtSaved = json.news?.top3
        ?.filter((n: { url?: string }) => !!n.url)
        .map((n: { title: string; url: string }) => ({
          title: n.title,
          url: n.url,
        }));

      return BookmarkDetailSchema.parse({
        cityId: json.cityId,
        cityName: json.cityName,
        countryName: json.countryName,
        imgUrl: json.imgUrl ?? null,
        createdAt: data.savedAt,
        // CityDetail.score.finalScore → matchingScore
        matchingScore: json.score?.finalScore ?? undefined,
        // before: 저장 당시 환율(krwPerDisplayUnit), current: 현재 환율
        exchangeAtSaved: {
          before: json.exchangeRate?.krwPerDisplayUnit ?? 0,
          current: data.currentExchange?.krwPerDisplayUnit ?? 0,
        },
        // CityDetail.news.top3 → newsAtSaved
        newsAtSaved: newsAtSaved?.length ? newsAtSaved : undefined,
        // CityDetail.airTicketAndHotel은 구조가 달라 flightAtSaved 불가
        flightAtSaved: undefined,
      });
    } catch {
      return DUMMY_DETAIL;
    }
  },

  // POST /api/bookmarks
  create: async (body: CreateBookmarkRequest) => {
    CreateBookmarkRequestSchema.parse(body);
    const { data } = await axiosInstance.post("/api/bookmarks", body);
    return data;
  },

  // DELETE /api/bookmarks/{bookmarkId}
  remove: async (bookmarkId: number) => {
    await axiosInstance.delete(`/api/bookmarks/${bookmarkId}`);
  },
};
