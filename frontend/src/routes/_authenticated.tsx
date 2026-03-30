import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export const Route = createFileRoute('/_authenticated')({
  // beforeLoad: 인증 가드 (비동기 가능)
  beforeLoad: () => {
    const { isLoggedIn, isGuest, hasCompletedPreference } = useAuthStore.getState();
    if (!isLoggedIn && !isGuest) {
      throw redirect({ to: '/login' });
    }
    if (!hasCompletedPreference) {
      throw redirect({ to: '/preference' });
    }
  },
  component: () => (
    <AuthenticatedLayout>
      <Outlet />
    </AuthenticatedLayout>
  ),
});
