import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';

export const useLogout = () => {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {},
    onSuccess: () => {
      logout(); // localStorage persist 초기화
      window.location.href = '/login'; // 하드 리다이렉트 → 모든 인메모리 상태 초기화
    },
  });
};
