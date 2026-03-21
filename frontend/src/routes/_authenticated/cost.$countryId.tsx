import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import CountryCostDetailPage from '@/pages/CountryCostDetailPage';

export const Route = createFileRoute('/_authenticated/cost/$countryId')({
  params: {
    parse: (p) => ({ countryId: z.coerce.number().parse(p.countryId) }),
    stringify: (p) => ({ countryId: String(p.countryId) }),
  },
  validateSearch: z.object({
    targetType: z.enum(['city', 'country']).default('city'),
  }),
  component: CountryCostDetailPage,
});
