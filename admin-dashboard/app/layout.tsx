import KeyboardVisibility from './components/keyboard-visibility';
import './keyboard.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './pagination.css';
import './routed.css';
import './responsive.css';
import './operations-workspace.css';
import './dashboard.css';
import './motion.css';
import './route-polish.css';
import './theme.css';
import { AdminProvider } from '../lib/admin';
import { AdminFrame, AdminGate } from './components/admin-shell';
import { brand } from '../lib/brand';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: `${brand.adminTitle} — Trust & Operations`,
  description: `Secure administration for the ${brand.name} marketplace.`,
  openGraph: {
    title: brand.adminTitle,
    description: 'Trust, moderation and marketplace operations.',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: `${brand.adminTitle} dashboard` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: brand.adminTitle,
    description: 'Trust, moderation and marketplace operations.',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('chodhiq-dashboard-theme');var d=t!=='light';document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AdminProvider>
          <KeyboardVisibility />
          <AdminGate>
            <AdminFrame>{children}</AdminFrame>
          </AdminGate>
        </AdminProvider>
      </body>
    </html>
  );
}
