/**
 * Only same-site paths are allowed as a post-login destination (no open redirect).
 * Plain module (no 'use client') so server pages like /login can call it too.
 */
// Browsers strip tab/newline/CR, so "/<TAB>/evil.com" would resolve as "//evil.com": reject control characters.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F]/;

export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\') || CONTROL_CHARS.test(next)) return fallback;
  return next;
}
