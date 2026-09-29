import Link from 'next/link';
import { Icon, PageHead } from '@/components/otw';

interface LoginPageProps {
  searchParams: Promise<{ tab?: string; gala?: string }>;
}

/** Log in / Create account. Placeholder until the auth flow is built. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { tab, gala } = await searchParams;
  const back = gala ? `/gala/${encodeURIComponent(gala)}` : '/';

  return (
    <main className="bg-blossom" style={{ minHeight: '100dvh', padding: '60px var(--pad)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'flex-start' }}>
        <PageHead title={tab === 'create' ? 'Create an Account' : 'Log in'} sub="Coming soon" />
        <Link className="btn sm cream" href={back}>
          <Icon name="back" size={18} /> {gala ? 'Back to the gala' : 'Back to OTW'}
        </Link>
      </div>
    </main>
  );
}
