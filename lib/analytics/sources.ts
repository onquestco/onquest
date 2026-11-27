import { z } from 'zod';

// Allowed values from docs/analytics/client-events.csv (quest_create_started.source). The sheet wins.
export const QuestCreateSourceSchema = z.enum([
  'home_banner',
  'home_empty',
  'create_menu',
  'quests_tab',
  'quests_empty',
  'make_your_own',
  'ftue',
  'whatis_sheet',
  // Added with analytics v2 (AN-07): the blog composer's Link a Quest → Create a Quest (click_loc 9)
  // and "Make your own Quest" on a private or removed Quest page (click_loc 3).
  'blog_link',
  'unavailable_quest',
]);

export type QuestCreateSource = z.infer<typeof QuestCreateSourceSchema>;
