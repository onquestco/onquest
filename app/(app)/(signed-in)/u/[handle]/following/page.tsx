import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { FollowsView } from '@/features/profile/FollowsView';
import { getFollows } from '@/features/profile/getFollows';
import { getProfile } from '@/features/profile/getProfile';
import { SITE_NAME } from '@/lib/site';

type Props = { params: Promise<{ handle: string }> };

export const metadata: Metadata = { title: `Following | ${SITE_NAME}`, robots: { index: false } };

// Signed in only (the (app) layout checks); never cached.
export default async function FollowingPage({ params }: Props) {
  const { handle } = await params;
  const [result, user] = await Promise.all([getProfile(handle), getCurrentUser()]);
  if (!result || !user) notFound();
  if ('movedTo' in result) permanentRedirect(`/@${result.movedTo}/following`);
  const { people } = await getFollows(result.profile.key, 'following');
  return <FollowsView kind="following" profile={result.profile} people={people} me={user.id} />;
}
