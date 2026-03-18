import { useQuery } from '@tanstack/react-query';
import { placesApi } from '@/api/places.api';

export const usePlaces = (cityId: number | null) =>
  useQuery({
    queryKey: ['places', cityId],
    queryFn: () => placesApi.getPlaces(cityId!),
    enabled: cityId != null,
    staleTime: 5 * 60 * 1000,
  });
