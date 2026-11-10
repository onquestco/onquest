import type { Metadata } from 'next';
import { ChooseTemplate } from '@/features/editor/ChooseTemplate';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Choose a template | ${SITE_NAME}`, robots: { index: false } };

export default async function TemplatePage({ params }: { params: Promise<{ key: string }> }) {
  return <ChooseTemplate tripKey={(await params).key} />;
}
