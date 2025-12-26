import { Metadata } from 'next';
import HomePage from './components/HomePage';

const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_URL || 'https://ayin.app';

export const metadata: Metadata = {
  title: 'AYIN | Agent Delegation on Base',
  description: 'Delegate trading authority to autonomous AI agents on Base.',
  openGraph: {
    title: 'AYIN | Agent Delegation on Base',
    description: 'Delegate trading authority to autonomous AI agents on Base.',
    images: [`${NEXT_PUBLIC_URL}/icon.png`],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${NEXT_PUBLIC_URL}/icon.png`,
    'fc:frame:post_url': `${NEXT_PUBLIC_URL}/api/frame`,
    'fc:frame:button:1': 'Launch Ayin',
  },
};

export default function Page() {
  return <HomePage />;
}

