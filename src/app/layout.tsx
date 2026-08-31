import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * The visitor app is the only surface a visitor sees. The project name is
 * deliberately legible and obviously branded: a bank sending visitors to a
 * non-bank domain runs against instincts banks train into customers, and
 * the address bar has to confirm an expectation rather than spring a
 * surprise (spec §3).
 */
export const metadata: Metadata = {
  title: 'UOB Booth',
  description: 'Tell us what is happening in your business.',
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Not locked: pinch-zoom is the only text-scaling route some visitors
  // have, and pixel type at this size is unforgiving (spec §18).
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#00237b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Both precached by the service worker; preloaded so the first
            frame renders at the right metrics on a cold load. */}
        <link
          rel="preload"
          href="/fonts/silkscreen.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="preload" href="/assets/background.webp" as="image" />
      </head>
      <body>{children}</body>
    </html>
  );
}
