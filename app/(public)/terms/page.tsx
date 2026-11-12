import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/site';
import { TermsOfUse } from '@/features/legal/TermsOfUse';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The rules for using OnQuest: who can use it, your content, and what is not allowed.',
  alternates: { canonical: absoluteUrl('/terms') },
};

export default function TermsPage() {
  return <TermsOfUse />;
}
