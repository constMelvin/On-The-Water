import { NextResponse, type NextRequest } from 'next/server';

/**
 * Per-request Content-Security-Policy with a script nonce (Next.js docs: guides/content-security-policy).
 * Only scripts carrying this request's nonce run ('strict-dynamic' lets them load their chunks), so an
 * injected <script> can't execute and steal the session from localStorage. Next.js reads the nonce
 * from the request's CSP header and adds it to its own scripts. Styles keep 'unsafe-inline': the app
 * uses style={{…}} attributes, which nonces can't cover, and inline styles can't run code.
 * The other security headers stay in next.config.ts.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
  const supabaseWs = supabaseUrl.replace(/^http/, 'ws');

  // Third parties, each for one feature:
  // - www.googleapis.com: the Gala Dump upload (the browser PUTs to a one-time Drive link).
  // - drive.google.com: the video player in the Dump viewer (thumbnails fall under img-src https:).
  // - nominatim.openstreetmap.org: Plan a Gala's place search (map tiles fall under img-src https:).
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${backendUrl} ${supabaseUrl} ${supabaseWs}${isDev ? ' ws://localhost:*' : ''} https://www.googleapis.com https://nominatim.openstreetmap.org`,
    'frame-src https://drive.google.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not static files, images, icons, or link prefetches.
      source: '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
