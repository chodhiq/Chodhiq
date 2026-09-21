import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ChodhiQ — Ask. Connect. Get it done. Coming soon.',
  description: 'Built for Malayalees in the UK. Discover local businesses, find services and connect with your community. ChodhiQ is coming soon. Providers: get in touch at chodhiq@gmail.com.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

