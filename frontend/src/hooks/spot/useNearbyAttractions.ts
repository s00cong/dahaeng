import { useQuery } from '@tanstack/react-query';
import { nearbyAttractionsApi } from '@/api/nearbyAttractions.api';

export function useNearbyAttractions(cityId: number) {
  return useQuery({
    queryKey: ['nearbyAttractions', cityId],
    queryFn: () => nearbyAttractionsApi.getNearbyAttractions(cityId),
    staleTime: 1000 * 60 * 10,
  });
}
