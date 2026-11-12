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
]);

export type QuestCreateSource = z.infer<typeof QuestCreateSourceSchema>;
