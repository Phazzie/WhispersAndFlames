import type { Metadata } from 'next';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Whispers and Flames',
  description: 'Explore intimacy through guided conversations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
