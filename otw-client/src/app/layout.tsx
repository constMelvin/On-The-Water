import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/query-provider';
import '@/index.css';

export const metadata: Metadata = {
  title: 'OTW - On The Water',
  description: 'Collaborative gala and trip planner',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
