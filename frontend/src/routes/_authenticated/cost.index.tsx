import { createFileRoute } from '@tanstack/react-router';
import CostPage from '@/pages/CostPage';

export const Route = createFileRoute('/_authenticated/cost/')({
  component: CostPage,
});
