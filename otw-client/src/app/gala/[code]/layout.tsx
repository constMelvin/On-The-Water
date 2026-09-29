import type { ReactNode } from 'react';
import { GalaProvider } from '@/lib/otw/gala-store';
import { GalaShell } from '@/components/gala/GalaShell';

interface GalaLayoutProps {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

/** Wraps every /gala/[code] screen in the gala state + responsive shell. */
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
      <GalaShell>{children}</GalaShell>
    </GalaProvider>
  );
}
