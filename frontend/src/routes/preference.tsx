import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import PreferenceFlowPage from '@/pages/PreferenceFlowPage';

export const Route = createFileRoute('/preference')({
  validateSearch: z.object({
    preview: z.enum(['onboarding']).optional(),
  }),
  component: PreferenceFlowPage,
});
