import type { Metadata } from 'next';
import { ReviewPages } from '@/features/editor/ReviewPages';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Review pages | ${SITE_NAME}`, robots: { index: false } };

export default async function ReviewPage({ params }: { params: Promise<{ key: string }> }) {
  return <ReviewPages tripKey={(await params).key} />;
}
