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
      const loginUrl = data.loginUrl.startsWith('http')
        ? data.loginUrl
        : `${window.location.origin}${data.loginUrl}`;
      window.location.href = loginUrl;
    },
  });
