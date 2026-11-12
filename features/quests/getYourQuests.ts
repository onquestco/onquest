import { z } from 'zod';
import { getMyQuests } from '@/features/editor/getMyQuests';
import { createServerSupabase } from '@/lib/supabase/server';
import type { QuestCard } from '@/lib/trip/cards';

const CountsSchema = z.array(z.object({ key: z.uuid(), like_count: z.number(), comment_count: z.number() }));

/** Your Quests (screen 20): every Quest, drafts included, with like and comment counts. */
export async function getYourQuests(): Promise<QuestCard[]> {
  const [quests, counts] = await Promise.all([
    getMyQuests(),
    createServerSupabase().then((supabase) => supabase.rpc('get_my_quest_counts')),
  ]);
  // Counts are extra: without them the cards still show, with 0.
  const rows = counts.error ? [] : CountsSchema.parse(counts.data);
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return quests.map((quest) => ({
    ...quest,
    likeCount: byKey.get(quest.key)?.like_count ?? 0,
    commentCount: byKey.get(quest.key)?.comment_count ?? 0,
  }));
}
