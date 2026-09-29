'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon, blob } from '@/components/otw';
import { useGala } from '@/lib/otw/gala-store';
import { GalaShell } from './GalaShell';

/** OTW not-found state for an unknown or invalid gala code. */
export function GalaNotFound() {
  return (
    <main className="bg-cream" style={{ minHeight: '100dvh', display: 'flex', padding: '0 var(--pad)' }}>
      <div className="empty err">
        <div className="ico xl" style={{ ...blob(3), color: 'var(--rosy-dark)' }}>
          <Icon name="alert" size={44} />
        </div>
        <h3>Hmm, hindi namin makita &apos;yan. Check the code and try again.</h3>
        <Link className="btn rosy" href="/join">
          Join a Gala
        </Link>
      </div>
    </main>
  );
}

/**
 * Decides what /gala/[code] shows once the gala has been read from storage:
 * the shell (I'm in it), the not-found state (unknown code), or Enter a Gala
 * (the gala exists but nobody on this device has joined it yet).
 */
export function GalaGate({ children }: { children: ReactNode }) {
  const { status, gala } = useGala();
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') router.replace(`/enter?code=${encodeURIComponent(gala.code)}`);
  }, [status, gala.code, router]);

  if (status === 'missing') return <GalaNotFound />;
  if (status !== 'ready') return null;
  return <GalaShell>{children}</GalaShell>;
}
