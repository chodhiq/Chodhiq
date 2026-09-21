import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import "./pagination.css";
import "./routed.css";
import "./responsive.css";
import ThemeControls from "./theme-controls";
import { AdminProvider } from "../lib/admin";
import { AdminGate } from "./components/admin-shell";
import { brand } from "../lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: `${brand.adminTitle} — Trust & Operations`,
  description: `Secure administration for the ${brand.name} marketplace.`,
  openGraph: {
    title: brand.adminTitle,
    description: "Trust, moderation and marketplace operations.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: `${brand.adminTitle} dashboard` }],
  },
  twitter: {
    card: "summary_large_image",
    title: brand.adminTitle,
    description: "Trust, moderation and marketplace operations.",
    images: ["/og.png"],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AdminProvider><ThemeControls /><AdminGate>{children}</AdminGate></AdminProvider>
      </body>
    </html>
  );
}

