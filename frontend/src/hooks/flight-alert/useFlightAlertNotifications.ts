import { useQuery } from '@tanstack/react-query';
import { flightAlertApi } from '@/api/flight-alert.api';
import { queryKeys } from '@/utils/queryKeys';

export const useFlightAlertNotifications = (page = 0) =>
  useQuery({
    queryKey: queryKeys.flightAlert.notifications(page),
    queryFn: () => flightAlertApi.getNotifications({ page, size: 10 }),
    staleTime: 30_000,
  });
