import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';

import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/special-elite/400.css';
import '@fontsource/black-ops-one/400.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Whispers and Flames: Eyes Only',
  description:
    'A classified game for couples. You each give a sealed statement; nothing is declassified until you both talk.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="antialiased">
        <body>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

// Note: Error boundaries must be client components, so we can't add one here directly
// Individual pages should wrap their content with ErrorBoundary as needed
