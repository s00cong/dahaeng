import { useQuery } from '@tanstack/react-query';
import { flightAlertApi } from '@/api/flight-alert.api';
import { queryKeys } from '@/utils/queryKeys';

export const useFlightAlertSubscriptions = () =>
  useQuery({
    queryKey: queryKeys.flightAlert.subscriptions,
    queryFn: flightAlertApi.getSubscriptions,
    staleTime: 30_000,
  });
