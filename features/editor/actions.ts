'use server';

import { z } from 'zod';
import { action } from '@/lib/action';
import { QuestCreateSourceSchema } from '@/lib/analytics/sources';
import { QuestDocumentSchema } from '@/lib/trip/schema';
import { saveError } from './dbErrors';
import { documentProblem } from './documentRules';

// Draft writes (spec A §4.2). Domain errors come back in `data`, never thrown. The arranging
// actions (nameLocations, searchPlaces, writeCaptions, reportCreateProgress) are in
// arrangeActions.ts (A-05).

const CreateSchema = z.object({
  key: z.uuid(),
  source: QuestCreateSourceSchema, // for quest_draft_created (A-14)
  startedAt: z.iso.datetime({ offset: true }),
});

/** On "Next" in Pick photos: the trip and its draft exist from here on. */
export const createQuest = action(CreateSchema, async ({ key }, { user, db }) => {
  const { data, error } = await db.rpc('create_trip', { p_key: key });
  const problem = saveError(error);
  if (problem === 'exists') return { created: false as const, error: 'exists' as const };
  if (error) throw new Error('Could not create Quest');
  return { created: true as const, savedAt: data as string, photoFolder: `${user.id}/${key}` };
});

const SaveDraftSchema = z.object({
  key: z.uuid(),
  basedOn: z.string().min(1),
  document: QuestDocumentSchema,
});

/** Autosave. Fails with `conflict` when another device saved first. */
export const saveQuestDraft = action(SaveDraftSchema, async ({ key, basedOn, document }, { db }) => {
  const problem = documentProblem(document);
  if (problem === 'too_many_photos') return { saved: false as const, error: 'too_many_photos' as const };
  // Anything else means the editor built a broken document: a bug, not something to show.
  if (problem) throw new Error(`Invalid Quest document: ${problem}`);

  const { data, error } = await db.rpc('save_trip_draft', {
    p_key: key,
    p_based_on: basedOn,
    p_document: document,
  });
  const failure = saveError(error);
  if (failure === 'conflict' || failure === 'not_found' || failure === 'too_many_photos') {
    return { saved: false as const, error: failure };
  }
  if (error) throw new Error('Could not save Quest');
  return { saved: true as const, savedAt: data as string };
});
