import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flightAlertApi } from '@/api/flight-alert.api';
import { queryKeys } from '@/utils/queryKeys';

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) => flightAlertApi.markRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.flightAlert.notifications() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.flightAlert.unreadCount });
    },
  });
};
