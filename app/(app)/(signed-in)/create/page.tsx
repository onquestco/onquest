import type { Metadata } from 'next';
import { CreateChooser } from '@/features/shell/CreateChooser';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Create | ${SITE_NAME}`, robots: { index: false } };

export default function CreatePage() {
  return <CreateChooser />;
}
