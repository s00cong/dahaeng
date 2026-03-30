import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flightAlertApi } from '@/api/flight-alert.api';
import { queryKeys } from '@/utils/queryKeys';
import type { FlightAlertSubscription } from '@/schemas/flight-alert.schema';

export const useDeleteFlightAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cityId: number) => flightAlertApi.deleteSubscription(cityId),
    onMutate: async (cityId: number) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.flightAlert.subscriptions });
      const previous = queryClient.getQueryData<FlightAlertSubscription[]>(queryKeys.flightAlert.subscriptions);
      queryClient.setQueryData<FlightAlertSubscription[]>(
        queryKeys.flightAlert.subscriptions,
        (old) => old?.filter((s) => s.cityId !== cityId) ?? [],
      );
      return { previous };
    },
    onError: (_err, _cityId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.flightAlert.subscriptions, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.flightAlert.subscriptions });
    },
  });
};
