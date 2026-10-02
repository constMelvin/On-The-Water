import { safeNext } from '@/lib/otw/safe-next';

export type LoginCtx = 'plan' | 'join' | 'enter' | 'me';

/** The /login URL that returns to `here` afterwards. Same-site only; never redirects /login to itself. */
export function loginUrl(here: string, opts: { tab?: 'login' | 'create'; ctx?: LoginCtx } = {}): string {
  if (here === '/login' || here.startsWith('/login?') || here.startsWith('/login/')) return '/login';
  const ctx = opts.ctx ? `&ctx=${opts.ctx}` : '';
  return `/login?tab=${opts.tab ?? 'login'}${ctx}&next=${encodeURIComponent(safeNext(here, '/'))}`;
}

/** True when `pathname` is the login page (or under it). */
export function isOnLoginPage(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/');
}
