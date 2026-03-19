import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { MEMBER_TAGS_QUERY_KEY } from "@/hooks/auth/useMemberTags";

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
 * 선호도 수정 — 기존 태그 중 제거된 것 DELETE 후 새 태그 POST
 * DELETE /api/member/tag/{id} (제거된 태그)
 * POST /api/member/tag  body: { tagIds: number[] }
 */
export const useUpdatePreference = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTagIds: number[]) => {
      // 현재 저장된 태그 목록 조회 (항상 서버에서 최신 데이터)
      const currentTags = await authApi.getMemberTags();

      // 새 선택에 없는 태그 → DELETE
      const toDelete = currentTags.filter((t) => !newTagIds.includes(t.tagId));
      await Promise.all(toDelete.map((t) => authApi.deleteTag(t.id)));

      // 새 태그 POST (백엔드가 기존 유지 + 신규 추가)
      await authApi.updatePreference({ tagIds: newTagIds });
    },
    onSuccess: () => {
      // 캐시 무효화 → MyPage, PreferencePage가 최신 태그를 반영
      void queryClient.invalidateQueries({ queryKey: MEMBER_TAGS_QUERY_KEY });
    },
    onSettled: () => {
      navigate({ to: '/mypage' });
    },
  });
};
