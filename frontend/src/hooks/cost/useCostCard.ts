import { useQuery } from '@tanstack/react-query';
import { costApi } from '@/api/cost.api';

export const useCostCard = () =>
  useQuery({
    queryKey: ['cost', 'card', 'TOP'],
    queryFn: () => costApi.getCostCard(),
    staleTime: 60 * 60 * 1000,
  });
