import type { ReactNode } from 'react';
import { RequireAccount } from '@/components/gala/RequireAccount';

/** An account is required to join a gala; without one, this sends the person to Create account first. */
export default function JoinLayout({ children }: { children: ReactNode }) {
  return <RequireAccount ctx="join">{children}</RequireAccount>;
}
