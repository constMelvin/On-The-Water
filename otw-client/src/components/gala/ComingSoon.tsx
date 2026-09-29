'use client';

import { PageHead } from '@/components/otw';
import { useGala } from '@/lib/otw/gala-store';

export interface ComingSoonProps {
  title: string;
  /** Leader-only title, e.g. "Gala settings" vs "Your settings". */
  leaderTitle?: string;
}

/** Placeholder page body inside the gala shell. */
export function ComingSoon({ title, leaderTitle }: ComingSoonProps) {
  const { role } = useGala();
  return <PageHead title={role === 'leader' && leaderTitle ? leaderTitle : title} sub="Coming soon" />;
}
