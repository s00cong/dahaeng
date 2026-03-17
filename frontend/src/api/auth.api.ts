import { axiosInstance } from './axiosInstance';
import {
  AuthCallbackResponseSchema,
  TokenReissueResponseSchema,
  GoogleLoginUrlResponseSchema,
  PreferenceTagRequestSchema,
  YoutubeStatusSchema,
} from '@/schemas/auth.schema';
import type { PreferenceTagRequest, AuthCallbackResponse } from '@/schemas/auth.schema';

export const authApi = {
  // GET /api/auth/google/login-url
  // 백엔드: bare { loginUrl: "/oauth2/authorization/google" }
  getGoogleLoginUrl: async () => {
    const { data } = await axiosInstance.get('/api/auth/google/login-url');
    return GoogleLoginUrlResponseSchema.parse(data);
  },

  // POST /api/auth/exchange (토큰 교환)
  // 백엔드: bare ExchangeResponse { tokenType, accessToken, member }
  exchangeCode: async (code: string) => {
    const { data } = await axiosInstance.post('/api/auth/exchange', { code });
    return AuthCallbackResponseSchema.parse(data);
  },

  // POST /api/auth/reissue
  // 백엔드: bare { accessToken }
  reissueToken: async () => {
    const { data } = await axiosInstance.post('/api/auth/reissue');
    return TokenReissueResponseSchema.parse(data);
  },

  // POST /api/auth/logout
  logout: async () => {
    await axiosInstance.post('/api/auth/logout');
  },

  // DELETE /api/auth/withdraw
  withdraw: async () => {
    await axiosInstance.delete('/api/auth/withdraw');
  },

  // 개발 전용 — 백엔드 없이 로컬 목 로그인
  devLogin: async (): Promise<AuthCallbackResponse> => {
    return {
      tokenType: 'Bearer',
      accessToken: 'dev-token',
      member: {
        id: 1,
        role: 'USER',
        nickname: '개발자',
        profileImageUrl: null,
      },
    };
  },

  // POST /api/member/tag (선호도 태그 최초 등록)
  submitPreference: async (body: PreferenceTagRequest) => {
    PreferenceTagRequestSchema.parse(body);
    await axiosInstance.post('/api/member/tag', body);
  },

  // PATCH /api/member/tag (선호도 태그 수정)
  updatePreference: async (body: PreferenceTagRequest) => {
    PreferenceTagRequestSchema.parse(body);
    await axiosInstance.patch('/api/member/tag', body);
  },

  // GET /api/members/youtube/status
  getYoutubeStatus: async () => {
    const { data } = await axiosInstance.get('/api/members/youtube/status');
    return YoutubeStatusSchema.parse(data);
  },

  // GET /api/members/youtube/tag
  getYoutubeConsentUrl: async () => {
    const { data } = await axiosInstance.get('/api/members/youtube/tag');
    return GoogleLoginUrlResponseSchema.parse(data);
  },
};
