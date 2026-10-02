import type { ReactNode } from 'react';
import { RequireAccount } from '@/components/gala/RequireAccount';

/** My Galas and History need an account; without one this sends the person to Log in first. */
export default function MeLayout({ children }: { children: ReactNode }) {
  return <RequireAccount ctx="me">{children}</RequireAccount>;
}
