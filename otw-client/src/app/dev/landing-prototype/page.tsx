import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Prototype } from './Prototype';

export const metadata: Metadata = {
  title: 'OTW landing prototype (dev)',
  robots: { index: false, follow: false },
};

/**
 * A standalone, interactive design prototype of a new OTW landing page. Dev-only (404s in production), uses
 * mock data and local state only, and is not linked from anywhere: the real landing page (app/page.tsx) is
 * untouched. Open it at /dev/landing-prototype while `npm run dev` is running.
 */
export default function LandingPrototypePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Prototype />;
}
