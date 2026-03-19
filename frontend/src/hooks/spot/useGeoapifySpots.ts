import { useQuery } from '@tanstack/react-query';
import { geoapifyApi } from '@/api/geoapify.api';

export const useGeoapifySpots = (lat: number | undefined, lon: number | undefined) =>
  useQuery({
    queryKey: ['geoapify', 'spots', lat, lon],
    queryFn: () => geoapifyApi.getSpots(lat!, lon!),
    enabled: lat != null && lon != null && lat !== 0 && lon !== 0,
    staleTime: 10 * 60 * 1000,
  });
