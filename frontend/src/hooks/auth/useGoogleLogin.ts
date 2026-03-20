import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';

/**
 * Google 로그인 URL 조회 후 리다이렉트
 * GET /api/auth/google/login-url
 */
export const useGoogleLogin = () =>
  useMutation({
    mutationFn: authApi.getGoogleLoginUrl,
    onSuccess: (data) => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
      const loginUrl = data.loginUrl.startsWith('http')
        ? data.loginUrl
        : `${baseUrl}${data.loginUrl}`;
      window.location.href = loginUrl;
    },
  });
