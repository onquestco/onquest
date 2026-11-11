import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/site';
import { PrivacyPolicy } from '@/features/legal/PrivacyPolicy';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What OnQuest collects, why, who processes it, and how to delete it.',
  alternates: { canonical: absoluteUrl('/privacy') },
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
