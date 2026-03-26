import { axiosInstance } from "./axiosInstance";
import {
  AuthCallbackResponseSchema,
  TokenReissueResponseSchema,
  GoogleLoginUrlResponseSchema,
  PreferenceTagRequestSchema,
  YoutubeStatusSchema,
} from "@/schemas/auth.schema";
import type {
  PreferenceTagRequest,
} from "@/schemas/auth.schema";

export const authApi = {
  // GET /api/auth/google/login-url
  // 백엔드: bare { loginUrl: "/oauth2/authorization/google" }
  getGoogleLoginUrl: async () => {
    const { data } = await axiosInstance.get("/api/auth/google/login-url");
    return GoogleLoginUrlResponseSchema.parse(data);
  },

  // POST /api/auth/google/one-tap (Google One Tap credential → app token)
  verifyOneTap: async (credential: string) => {
    const { data } = await axiosInstance.post('/api/auth/google/one-tap', { credential });
    return AuthCallbackResponseSchema.parse(data);
  },

  // POST /api/auth/exchange (토큰 교환)
  // 백엔드: bare ExchangeResponse { tokenType, accessToken, member }
  exchangeCode: async (code: string) => {
    const { data } = await axiosInstance.post("/api/auth/exchange", { code });
    return AuthCallbackResponseSchema.parse(data);
  },

  // POST /api/auth/reissue
  // 백엔드: bare { accessToken }
  reissueToken: async () => {
    const { data } = await axiosInstance.post("/api/auth/reissue");
    return TokenReissueResponseSchema.parse(data);
  },

  // DELETE /api/auth/withdraw
  withdraw: async () => {
    await axiosInstance.delete("/api/auth/withdraw");
  },

  // POST /api/member/tag (선호도 태그 등록 — 신규/수정 모두 POST, 백엔드가 upsert 처리)
  submitPreference: async (body: PreferenceTagRequest) => {
    PreferenceTagRequestSchema.parse(body);
    await axiosInstance.post("/api/member/tag", body); // { tagIds: number[] }
  },

  // POST /api/member/tag (선호도 태그 수정 — 백엔드에 PATCH 없음, POST upsert 재사용)
  updatePreference: async (body: PreferenceTagRequest) => {
    PreferenceTagRequestSchema.parse(body);
    await axiosInstance.post("/api/member/tag", body); // { tagIds: number[] }
  },

  // GET /api/member/tag — 내 태그 목록 조회 (태그 등록 여부 확인용)
  getMemberTags: async (): Promise<
    { id: number; tagId: number; isFromYoutube: boolean }[]
  > => {
    const { data } = await axiosInstance.get("/api/member/tag");
    return data;
  },

  // DELETE /api/member/tag/{id} — memberTag 레코드 id로 태그 삭제
  deleteTag: async (memberTagId: number): Promise<void> => {
    await axiosInstance.delete(`/api/member/tag/${memberTagId}`);
  },

  // GET /api/members/youtube/status
  getYoutubeStatus: async () => {
    const { data } = await axiosInstance.get("/api/members/youtube/status");
    return YoutubeStatusSchema.parse(data);
  },

  // GET /api/member/youtube/tag
  getYoutubeConsentUrl: async () => {
    const { data } = await axiosInstance.get("/api/member/tag");
    return GoogleLoginUrlResponseSchema.parse(data);
  },
};
