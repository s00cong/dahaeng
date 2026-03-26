import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';

/**
 * 회원 탈퇴
 * DELETE /api/auth/withdraw
 */
export const useWithdraw = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.withdraw,
    onSuccess: () => {
      logout();
      queryClient.clear();
      navigate({ to: '/login' });
    },
    onError: () => {
      toast.error('회원 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.');
    },
  });
};
