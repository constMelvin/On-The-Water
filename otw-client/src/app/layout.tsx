import type { Metadata } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import '../index.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

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
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="font-sans bg-cream text-[#5c4655] antialiased">
        {children}
      </body>
    </html>
  );
}