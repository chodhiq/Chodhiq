import KeyboardVisibility from './components/keyboard-visibility';
import './keyboard.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ThemeControls from './theme-controls';
import './globals.css';
import './theme.css';
import './workflow.css';
import './notifications.css';
import './responsive.css';
import './legal.css';
import { brand } from '../lib/brand';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: `${brand.businessTitle} — Grow your local business`,
  description: `Manage your ${brand.name} listing, services, reviews, analytics and plan.`,
  openGraph: {
    title: brand.businessTitle,
    description: 'Grow your local business.',
    images: [
      { url: '/og.png', width: 1536, height: 1024, alt: `${brand.businessTitle} dashboard` },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: brand.businessTitle,
    description: 'Grow your local business.',
    images: ['/og.png'],
  },
  icons: {
    icon: brand.logoPath,
    shortcut: brand.logoPath,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <KeyboardVisibility />
        <ThemeControls />
        {children}
      </body>
    </html>
  );
}
