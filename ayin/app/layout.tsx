import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RootProvider } from './rootProvider';
import './globals.css';
import { MiniKit } from './providors/minikit';
import { AutoAuth } from './api/auth/auto-auth';
import { UserBadge } from './components/auth/user-badge';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        <MiniKit>
          <AutoAuth />
          {children}
        </MiniKit>
      </body>
    </html>
  );
}

export const metadata = {
  title: 'Ayin - AI Prediction Markets',
  description: 'Delegate to autonomous trading agents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        <MiniKit>
          {children}
        </MiniKit>
      </body>
    </html>
  );
}

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


