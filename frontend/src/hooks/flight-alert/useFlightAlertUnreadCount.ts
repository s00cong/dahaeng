import { useQuery } from '@tanstack/react-query';
import { flightAlertApi } from '@/api/flight-alert.api';
import { queryKeys } from '@/utils/queryKeys';
import { useAuthStore } from '@/stores/authStore';

export const useFlightAlertUnreadCount = () => {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.flightAlert.unreadCount,
    queryFn: flightAlertApi.getUnreadCount,
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
};
