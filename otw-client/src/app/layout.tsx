import type { Metadata } from 'next';
import '../index.css';

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
      <body className="font-sans bg-cream text-[#5c4655] antialiased">
        {children}
      </body>
    </html>
  );
}
