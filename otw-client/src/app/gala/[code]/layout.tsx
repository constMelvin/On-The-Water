import type { ReactNode } from 'react';
import { GalaProvider } from '@/lib/otw/gala-store';
import { GalaGate } from '@/components/gala/GalaGate';

interface GalaLayoutProps {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

/**
 * Canonical gala route. Wraps every /gala/[code] screen in the gala state and the
 * responsive shell (or the not-found state for an unknown code).
 */
export default async function GalaLayout({ children, params }: GalaLayoutProps) {
  const { code } = await params;
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    /* keep the raw segment */
  }

  return (
    <GalaProvider code={decoded}>
      <GalaGate>{children}</GalaGate>
    </GalaProvider>
  );
}
