import type { ReactNode } from 'react';
import { RequireAccount } from '@/components/gala/RequireAccount';

/** Enter a Gala (code + password) is for people with an account; without one, they log in first. */
export default function EnterLayout({ children }: { children: ReactNode }) {
  return <RequireAccount ctx="enter">{children}</RequireAccount>;
}
