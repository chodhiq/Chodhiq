import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL('https://chodhiq.co.uk'),
  title: 'ChodhiQ — Discover local businesses and community in the UK',
  description: 'Built for Malayalees in the UK. Discover local businesses, find services and connect with your community. ChodhiQ is coming soon. Providers: get in touch at business@chodhiq.co.uk.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.png', shortcut: '/favicon.png' },
  openGraph: {
    type: 'website',
    url: 'https://chodhiq.co.uk/',
    siteName: 'ChodhiQ',
    title: 'ChodhiQ — Discover local businesses and community in the UK',
    description: 'Discover local businesses, find services and connect with the Malayalee community in the UK.',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
