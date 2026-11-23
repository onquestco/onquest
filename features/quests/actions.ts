'use server';

import { z } from 'zod';
import { action } from '@/lib/action';
import type { QuestCard } from '@/lib/trip/cards';
import { getYourQuests } from './getYourQuests';

/**
 * ⋯ on your own profile (OQ-15): the cached profile page has no savedAt to base changes on, so the
 * sheet loads the Quest as Your Quests has it. null when it isn't yours (or no longer exists).
 */
export const loadQuestToManage = action(
  z.object({ key: z.uuid() }),
  async ({ key }): Promise<QuestCard | null> =>
    (await getYourQuests()).find((quest) => quest.key === key) ?? null,
);
