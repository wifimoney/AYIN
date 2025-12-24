import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RootProvider } from './rootProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AYIN | Agent Delegation on Base',
  description: 'Delegate trading authority to autonomous AI agents on Base.',
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: "https://ayin.app/icon.png",
      button: {
        title: "Launch Ayin",
        action: {
          type: "launch_frame",
          name: "Ayin",
          url: "https://ayin.app",
          splashImageUrl: "https://ayin.app/splash.png",
          splashBackgroundColor: "#000000"
        }
      }
    })
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} font-sans antialiased`}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}


