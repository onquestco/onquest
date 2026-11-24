import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';
import { getSettings } from '@/features/account/getSettings';
import { getMyQuestsForLinking } from './getMyQuestsForLinking';
import { hasBlogAccess } from './hasBlogAccess';

/**
 * What /blogs/new needs: access (spec §3.9), the writer, their published Quests for "Link a Quest",
 * and the Settings default visibility for the Post sheet. Null when they can't start a blog here.
 */
export async function getNewBlogContext() {
  const user = await getCurrentUser();
  if (!user || !(await hasBlogAccess())) return null;
  const [profile, settings, quests] = await Promise.all([getMyProfile(user.id), getSettings(), getMyQuestsForLinking()]);
  if (!profile) return null;
  return {
    userId: user.id,
    writer: { handle: profile.handle, name: profile.name ?? profile.handle },
    defaultVisibility: settings?.settings.defaultVisibility ?? 'public',
    quests,
  };
}
