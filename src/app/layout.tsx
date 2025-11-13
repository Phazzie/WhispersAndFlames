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

// Note: Error boundaries must be client components, so we can't add one here directly
// Individual pages should wrap their content with ErrorBoundary as needed
