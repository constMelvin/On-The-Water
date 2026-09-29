import type { Metadata } from 'next';
import { EnterGala } from '@/features/enter-a-gala/EnterGala';

export const metadata: Metadata = { title: 'Enter a Gala · OTW' };

interface EnterPageProps {
  searchParams: Promise<{ code?: string }>;
}

/** Enter a Gala (code + password, then "Which one are you?"). */
export default async function EnterPage({ searchParams }: EnterPageProps) {
  const { code } = await searchParams;
  return <EnterGala initialCode={code ?? ''} />;
}
