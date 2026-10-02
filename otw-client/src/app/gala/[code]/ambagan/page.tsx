import { Expenses } from '@/components/gala/expenses/Expenses';

interface AmbaganPageProps {
  params: Promise<{ code: string }>;
}

/** Ambagan (expense tracker) tab. The gala code keys the expenses slices. */
export default async function AmbaganPage({ params }: AmbaganPageProps) {
  const { code } = await params;
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    /* keep the raw segment */
  }
  return <Expenses code={decoded} />;
}
