import { useQuery } from '@tanstack/react-query';
import { openTripMapApi } from '@/api/opentripmap.api';

export const useOpenTripMapSpots = (lat: number | undefined, lon: number | undefined) =>
  useQuery({
    queryKey: ['opentripmap', 'spots', lat, lon],
    queryFn: () => openTripMapApi.getSpots(lat!, lon!),
    enabled: lat != null && lon != null && lat !== 0 && lon !== 0,
    staleTime: 10 * 60 * 1000,
  });
