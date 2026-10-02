import { Budget } from '@/components/gala/budget/Budget';

interface BudgetPageProps {
  params: Promise<{ code: string }>;
}

/** Gastos (budget estimator) tab. The gala code keys the budget slice. */
export default async function BudgetPage({ params }: BudgetPageProps) {
  const { code } = await params;
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    /* keep the raw segment */
  }
  return <Budget code={decoded} />;
}
