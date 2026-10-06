import type { Metadata } from 'next';
import { connection } from 'next/server';
import '../index.css';
import '../styles/otw.css';
import { QueryProvider } from '@/providers';

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
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
