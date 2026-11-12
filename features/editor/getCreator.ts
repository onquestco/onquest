import { redirect } from 'next/navigation';
import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';

export type Creator = { handle: string; name: string | null };

/** The signed-in creator, for previews and links. No username yet → onboarding first. */
export async function getCreator(): Promise<Creator> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const profile = await getMyProfile(user.id);
  if (!profile) redirect('/onboarding');
  return profile;
}
