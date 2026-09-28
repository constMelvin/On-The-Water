import { RoleAwareDashboard } from '@/components/dashboard';

interface GalaDashboardPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function GalaDashboardPage({
  params,
}: GalaDashboardPageProps) {
  const { code } = await params;

  return <RoleAwareDashboard code={code} />;
}
