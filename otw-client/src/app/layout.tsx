import type { Metadata } from 'next';
import '../index.css';
import '../styles/otw.css';
import { QueryProvider } from '@/providers';

export const metadata: Metadata = {
  title: 'OTW — Tara G!',
  description: 'Group planning app for plans that actually happen',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
