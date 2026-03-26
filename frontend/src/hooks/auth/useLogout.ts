import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';

/**
 * 로그아웃
 * POST /api/auth/logout
 */
export const useLogout = () => {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      try { await authApi.logout(); } catch (_) {}
    },
    onSuccess: () => {
      logout(); // localStorage persist 초기화
      window.location.href = '/login'; // 하드 리다이렉트 → 모든 인메모리 상태 초기화
    },
  });
};
