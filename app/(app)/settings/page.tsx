import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSettings } from '@/features/account/getSettings';
import { SettingsView } from '@/features/account/SettingsView';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Settings | ${SITE_NAME}`, robots: { index: false } };

export default async function SettingsPage() {
  const settings = await getSettings();
  if (!settings) redirect('/onboarding');
  return <SettingsView email={settings.email} settings={settings.settings} savedAt={settings.savedAt} />;
}
