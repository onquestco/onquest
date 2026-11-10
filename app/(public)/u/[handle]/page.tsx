import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getProfile } from '@/features/profile/getProfile';
import { profileMetadata } from '@/features/profile/metadata';
import { ProfileView } from '@/features/profile/ProfileView';

type Props = { params: Promise<{ handle: string }> };

// Cached after the first visit, like Quest pages (tags profile:{key} and profile-url:{handle}).
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getProfile((await params).handle);
  return result && 'profile' in result ? profileMetadata(result.profile) : {};
}

export default async function ProfilePage({ params }: Props) {
  const result = await getProfile((await params).handle);
  if (!result) notFound();
  if ('movedTo' in result) permanentRedirect(`/@${result.movedTo}`);
  return <ProfileView profile={result.profile} />;
}
