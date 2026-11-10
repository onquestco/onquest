import type { Metadata } from 'next';
import { Arranging } from '@/features/editor/Arranging';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Arranging | ${SITE_NAME}`, robots: { index: false } };

export default async function ArrangePage({ params }: { params: Promise<{ key: string }> }) {
  return <Arranging tripKey={(await params).key} />;
}
