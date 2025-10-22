import type { Metadata } from 'next';

import './globals.css';
import { Playfair_Display } from 'next/font/google';

import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Whispers and Flames',
  description: 'Explore intimacy through guided conversations.',
};

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('antialiased', playfair.variable)}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
