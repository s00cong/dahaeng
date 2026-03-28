import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flightAlertApi } from '@/api/flight-alert.api';
import { queryKeys } from '@/utils/queryKeys';

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) => flightAlertApi.markRead(notificationId),
    onMutate: () => {
      // unreadCount만 즉시 -1 (깜빡임 방지)
      queryClient.setQueryData<{ count: number }>(
        queryKeys.flightAlert.unreadCount,
        (old) => ({ count: old != null && old.count > 0 ? old.count - 1 : 0 }),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.flightAlert.notifications() });
    },
  });
};
