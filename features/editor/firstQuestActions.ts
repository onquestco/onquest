'use server';

import { z } from 'zod';
import { action } from '@/lib/action';
import { hasPublishedQuest } from './firstQuest';

/**
 * Read only: whether I've published a Quest, for "Make your own Quest" on someone else's cached
 * Quest page (create_quest_click.is_first_quest_flg). null when it couldn't be read.
 */
export const checkHasPublishedQuest = action(z.object({}), async (_input, { user, db }) => ({
  hasPublishedQuest: (await hasPublishedQuest(db, user.id)) ?? null,
}));
