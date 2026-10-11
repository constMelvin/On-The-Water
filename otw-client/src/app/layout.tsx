import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import '../index.css';
import '../styles/otw.css';
import { QueryProvider } from '@/providers';
import { LogoutDialog } from '@/components/nav/LogoutDialog';
import { THEME_INIT_SCRIPT } from '@/lib/otw/theme-script';

export const metadata: Metadata = {
  title: 'OTW — Tara G!',
  description: 'Group planning app for plans that actually happen',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render every page per request so it gets this request's CSP nonce (see src/proxy.ts).
  await connection();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    // data-theme is set by the script below before first paint, so the server markup and the client differ on purpose.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        {/* Sets <html data-theme> from the saved choice (else the OS) before paint: no flash. Nonce'd for the CSP. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <QueryProvider>
          {children}
          <LogoutDialog />
        </QueryProvider>
      </body>
    </html>
  );
}
