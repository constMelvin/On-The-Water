import { redirect } from 'next/navigation';

interface OldGalaRouteProps {
  params: Promise<{ code: string }>;
}

/** Old gala URL (/OTW-7K2P). Kept so existing links still work; the dashboard lives at /gala/[code]. */
export default async function OldGalaRoute({ params }: OldGalaRouteProps) {
  const { code } = await params;
  redirect(`/gala/${code}`);
}
