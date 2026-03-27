import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 650;

/**
 * Google 로그인 — 팝업 방식
 * 1) 백엔드에서 loginUrl 조회
 * 2) window.open으로 팝업 열기
 * 3) 팝업 안의 AuthCallbackPage가 postMessage로 결과를 부모에게 전달
 * → 백엔드 변경 없음
 */
export const useGoogleLogin = () =>
  useMutation({
    mutationFn: authApi.getGoogleLoginUrl,
    onSuccess: (data) => {
      const loginUrl = data.loginUrl.startsWith('http')
        ? data.loginUrl
        : new URL(data.loginUrl, import.meta.env.VITE_API_BASE_URL).toString();

      const left = Math.round(window.screenX + (window.outerWidth - POPUP_WIDTH) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2);

      window.open(
        loginUrl,
        'googleLogin',
        `popup,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`,
      );
    },
  });
