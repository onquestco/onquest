import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { EditProfileForm } from '@/features/account/EditProfileForm';
import { getSettings } from '@/features/account/getSettings';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Edit profile | ${SITE_NAME}`, robots: { index: false } };

export default async function EditProfilePage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  if (!user || !settings) redirect('/onboarding');
  return (
    <EditProfileForm
      initial={{
        userId: user.id,
        name: settings.name,
        handle: settings.handle,
        bio: settings.bio,
        homeCity: settings.homeCity,
        avatarUrl: settings.avatarUrl,
        savedAt: settings.savedAt,
      }}
    />
  );
}
