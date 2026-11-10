'use server';

import { updateTag } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { action } from '@/lib/action';
import { profileTag } from '@/lib/cacheTags';
import { notifyFollowed } from '@/lib/email/notifyServer';

// Following (spec C §3.3, §4.2). Set-state, like likes: repeated taps never add follows.

const FollowSchema = z.object({
  targetKey: z.uuid(),
  follow: z.boolean(),
  source: z.enum(['profile', 'quest', 'explore', 'search', 'followers_list']), // user_followed.source (C-12)
});

export const setFollow = action(FollowSchema, async ({ targetKey, follow }, { user, db }) => {
  if (targetKey === user.id) return { saved: false as const, error: 'self' as const };
  const { data, error } = await db.rpc('set_follow', { p_target_key: targetKey, p_follow: follow });
  if (error?.code === 'OQ404') return { saved: false as const, error: 'not_found' as const };
  if (error?.code === 'OQ422') return { saved: false as const, error: 'self' as const };
  if (error) throw new Error('Could not save follow');
  const result = z
    .object({ following: z.boolean(), notified: z.boolean(), follower_count: z.number() })
    .parse(data);
  // Both profiles' counts change.
  updateTag(profileTag(user.id));
  updateTag(profileTag(targetKey));
  if (result.notified) after(() => notifyFollowed({ followeeKey: targetKey, followerKey: user.id }));
  return { saved: true as const, following: result.following, followerCount: result.follower_count };
});
