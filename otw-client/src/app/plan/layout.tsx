import type { ReactNode } from 'react';
import { RequireAccount } from '@/components/gala/RequireAccount';

/** An account is required to plan a gala; without one, this sends the person to Create account first. */
export default function PlanLayout({ children }: { children: ReactNode }) {
  return <RequireAccount ctx="plan">{children}</RequireAccount>;
}
