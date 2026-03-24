import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flightAlertApi } from '@/api/flight-alert.api';
import { queryKeys } from '@/utils/queryKeys';

export const useDeleteFlightAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cityId: number) => flightAlertApi.deleteSubscription(cityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.flightAlert.subscriptions });
    },
  });
};
