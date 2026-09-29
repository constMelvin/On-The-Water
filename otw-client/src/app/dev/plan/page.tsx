import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlanWizard } from '@/features/plan-a-gala';

export const metadata: Metadata = {
  title: 'Plan a Gala skeleton (dev)',
  robots: { index: false, follow: false },
};

/**
 * Dev-only preview of the Plan a Gala skeleton. The real /plan route belongs to
 * teammates and is untouched; they mount <PlanWizard /> there when ready.
 */
export default function PlanSkeletonPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PlanWizard />;
}
