import { z } from 'zod';

// 사용자 정보 (백엔드 UserResponse와 일치)
export const UserSchema = z.object({
  id: z.number(),
  role: z.string(),
  nickname: z.string(),
  profileImageUrl: z.string().nullable(),
  email: z.string().email().optional(), // /api/auth/me 등에서 사용될 수 있음
});
export type User = z.infer<typeof UserSchema>;

// 로그인/콜백 응답 (백엔드 ExchangeResponse와 일치)
export const AuthCallbackResponseSchema = z.object({
  tokenType: z.string(),
  accessToken: z.string(),
  member: UserSchema,
});
export type AuthCallbackResponse = z.infer<typeof AuthCallbackResponseSchema>;

// 토큰 재발급 응답
export const TokenReissueResponseSchema = z.object({
  accessToken: z.string(),
});
export type TokenReissueResponse = z.infer<typeof TokenReissueResponseSchema>;

// Google 로그인 URL 응답
export const GoogleLoginUrlResponseSchema = z.object({
  loginUrl: z.string(), // 백엔드가 "/oauth2/authorization/google" (상대경로) 반환
});
export type GoogleLoginUrlResponse = z.infer<typeof GoogleLoginUrlResponseSchema>;

// 선호도 태그 요청
export const PreferenceTagRequestSchema = z.object({
  tags: z.array(z.string()),
});
export type PreferenceTagRequest = z.infer<typeof PreferenceTagRequestSchema>;

// YouTube 연동 상태
export const YoutubeStatusSchema = z.object({
  connected: z.boolean(),
  channelId: z.string().optional(),
});
export type YoutubeStatus = z.infer<typeof YoutubeStatusSchema>;
