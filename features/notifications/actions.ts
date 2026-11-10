'use server';

import { z } from 'zod';
import { action } from '@/lib/action';

/** Opening the bell marks everything up to `until` as seen. It only ever moves forward. */
export const markNotificationsSeen = action(
  z.object({ until: z.iso.datetime({ offset: true }) }),
  async ({ until }, { db }) => {
    const { data, error } = await db.rpc('mark_notifications_seen', { p_until: until });
    if (error) throw new Error('Could not mark notifications seen');
    return { seenUntil: data as string };
  },
);
