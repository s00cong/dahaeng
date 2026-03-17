import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";

/**
 * 선호도 입력 (최초 등록) — 성공 시 /main으로 이동
 * POST /api/member/tag  body: { tagIds: number[] }
 */
export const useSubmitPreference = () => {
  const { setHasCompletedPreference } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (tagIds: number[]) => authApi.submitPreference({ tagIds }),
    onSuccess: () => {
      setHasCompletedPreference(true);
    },
    onSettled: () => {
      navigate({ to: '/main', search: { tab: 'recommend' } });
    },
  });
};

/**
 * 선호도 수정 — 성공 시 /mypage로 이동
 * POST /api/member/tag  body: { tagIds: number[] }  (백엔드 upsert)
 */
export const useUpdatePreference = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (tagIds: number[]) => authApi.updatePreference({ tagIds }),
    onSettled: () => {
      navigate({ to: '/mypage' });
    },
  });
};
