import { getDashboardData } from '@/app/(manage)/products/actions';
import { JobsContent } from '@/presentation/components/dashboard/DashboardContent';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const { jobs } = await getDashboardData();

  return <JobsContent jobs={jobs} />;
}
