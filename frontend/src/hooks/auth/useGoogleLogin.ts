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
      // 로컬 dev: Vite에 /oauth2/** 라우트가 없으므로 백엔드 URL을 직접 사용
      // 프로덕션: nginx가 /oauth2/** → 백엔드로 프록시하므로 같은 오리진 사용
      const base = import.meta.env.DEV
        ? (import.meta.env.VITE_API_BASE_URL as string ?? '').replace(/\/+$/, '')
        : window.location.origin;
      const loginUrl = data.loginUrl.startsWith('http')
        ? data.loginUrl
        : `${base}${data.loginUrl.startsWith('/') ? '' : '/'}${data.loginUrl}`;

      const left = Math.round(window.screenX + (window.outerWidth - POPUP_WIDTH) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2);

      window.open(
        loginUrl,
        'googleLogin',
        `popup,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`,
      );
    },
  });
