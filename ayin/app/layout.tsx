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
