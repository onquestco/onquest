import type { Metadata } from 'next';
import { ShareScreen } from '@/features/editor/ShareScreen';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = { title: `Your Quest is live | ${SITE_NAME}`, robots: { index: false } };

export default async function SharePage({ params }: { params: Promise<{ key: string }> }) {
  return <ShareScreen tripKey={(await params).key} siteUrl={SITE_URL} />;
}
