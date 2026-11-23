import type { Metadata } from 'next';
import { Welcome } from '@/features/account/Welcome';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Welcome | ${SITE_NAME}`, robots: { index: false } };

export default function WelcomePage() {
  return <Welcome />;
}
