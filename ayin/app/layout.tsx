import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { RootProvider } from './rootProvider';
import './globals.css';
import { AutoAuth } from './components/auth/AutoAuth';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
      <head>
        <link rel="stylesheet" href="/onchainkit.css" />
      </head>
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <RootProvider>
          <AutoAuth />
          {children}
        </RootProvider>
      </body>
    </html>
  );
}

