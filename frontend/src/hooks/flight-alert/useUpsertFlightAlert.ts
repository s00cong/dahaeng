import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flightAlertApi } from '@/api/flight-alert.api';
import { queryKeys } from '@/utils/queryKeys';

export const useUpsertFlightAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cityId, thresholdPrice }: { cityId: number; thresholdPrice: number }) =>
      flightAlertApi.upsertSubscription(cityId, thresholdPrice),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.flightAlert.subscriptions });
    },
  });
};
