import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * 로그아웃
 * POST /api/auth/logout
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const { setRecommendResults, setRecommendRequest, setRecommendActive, closeRightPanel } = useUiStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      try { await authApi.logout(); } catch (_) {}
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
      setRecommendResults([]);
      setRecommendRequest({ selectedTags: [], userTotalBudget: 0, travelDays: 0, month: 0 });
      setRecommendActive(false);
      closeRightPanel();
      navigate({ to: '/login' });
    },
  });
};
