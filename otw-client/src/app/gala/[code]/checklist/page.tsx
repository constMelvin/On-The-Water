import { Checklist } from '@/components/gala/checklist/Checklist';

interface ChecklistPageProps {
  params: Promise<{ code: string }>;
}

/** Checklist tab. The gala code keys the checklist slice. */
export default async function ChecklistPage({ params }: ChecklistPageProps) {
  const { code } = await params;
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    /* keep the raw segment */
  }
  return <Checklist code={decoded} />;
}
