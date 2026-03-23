import { useEffect, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const isPopup = () =>
  typeof window !== 'undefined' && !!window.opener && !window.opener.closed;

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { code, error: oauthError } = useSearch({ from: '/auth/callback' });
  const { setAccessToken, setUser, setHasCompletedPreference } = useAuthStore();
  const called = useRef(false);

  const { mutate: processCallback, isError, error } = useMutation({
    mutationFn: (authCode: string) => authApi.exchangeCode(authCode),
    onSuccess: async (data) => {
      const { accessToken, member } = data;
      setAccessToken(accessToken);
      setUser(member);

      let nextRoute: '/main' | '/preference' = '/main';
      let hasTags = false;
      try {
        const tags = await authApi.getMemberTags();
        hasTags = tags.length > 0;
        setHasCompletedPreference(hasTags);
        nextRoute = hasTags ? '/main' : '/preference';
      } catch {
        setHasCompletedPreference(false);
        nextRoute = '/preference';
      }

      if (isPopup()) {
        // 팝업 모드: 부모 창에 결과 전달 후 팝업 닫기
        window.opener.postMessage(
          {
            type: 'GOOGLE_AUTH_SUCCESS',
            accessToken,
            user: member,
            hasCompletedPreference: hasTags,
            nextRoute,
          },
          window.location.origin,
        );
        window.close();
      } else {
        // 리다이렉트 모드 폴백 (팝업이 막힌 경우)
        navigate({ to: nextRoute });
      }
    },
    onError: () => {
      if (isPopup()) {
        window.opener.postMessage(
          { type: 'GOOGLE_AUTH_ERROR' },
          window.location.origin,
        );
        window.close();
      } else {
        navigate({ to: '/login' });
      }
    },
  });

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (oauthError) {
      navigate({ to: '/login' });
      return;
    }
    if (code) {
      processCallback(code);
    } else {
      navigate({ to: '/login' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
          <p className="text-base font-medium text-foreground">
            로그인 처리 중 오류가 발생했습니다
          </p>
          {(error as Error)?.message && (
            <p className="text-sm text-muted-foreground max-w-xs">
              {(error as Error).message}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate({ to: '/login' })}>
          로그인 페이지로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="size-10 animate-spin text-primary" aria-label="로그인 처리 중" />
      <p className="text-sm text-muted-foreground">로그인 처리 중...</p>
    </div>
  );
};

export default AuthCallbackPage;
