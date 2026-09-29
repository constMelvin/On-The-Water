import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import KitView from './KitView';

export const metadata: Metadata = {
  title: 'OTW kit (dev)',
  robots: { index: false, follow: false },
};

/** Dev-only design kit. Compare with reference/otw/otw-app.html#/system. */
export default function KitPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <KitView />;
}
