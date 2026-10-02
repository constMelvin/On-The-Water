/**
 * Only same-site paths are allowed as a post-login destination (no open redirect).
 * Plain module (no 'use client') so server pages like /login can call it too.
 */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}
