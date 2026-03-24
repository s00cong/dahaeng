import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import PreferenceFlowPage from '@/pages/PreferenceFlowPage';

export const Route = createFileRoute('/preference')({
  beforeLoad: () => {
    const { isLoggedIn } = useAuthStore.getState();
    if (!isLoggedIn) {
      throw redirect({ to: '/login' });
    }
  },
  validateSearch: z.object({
    preview: z.enum(['onboarding']).optional(),
  }),
  component: PreferenceFlowPage,
});
