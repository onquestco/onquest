'use server';

import { after } from 'next/server';
import { z } from 'zod';
import { getMyProfile } from '@/features/account/getCurrentUser';
import { action } from '@/lib/action';
import { absoluteUrl } from '@/lib/site';
import { deletePhotoFiles, deleteQuestFiles, listPhotoIds, photoUploadedAt } from '@/lib/storage';
import { countWords } from '@/lib/trip/countWords';
import { VisibilitySchema } from '@/lib/trip/schema';
import { draftToTripData } from '@/lib/trip/toTripData';
import { getTemplate } from '@/templates/registry';
import { saveError } from './dbErrors';
import { photosToSweep } from './photoSweep';
import { firstPublishSlug } from './publishSlug';
import { loadOwnTrip } from './questRows';
import { refreshQuestPages, refreshQuestSocial } from './refreshTrip';

// Publishing and the ⋯ menu (spec A §4.2). Every change to the public row passes the saved_at it
// was based on; a stale tab gets `conflict` ("This Quest changed on another device").

const PublishSchema = z.object({
  key: z.uuid(),
  basedOnDraft: z.string().min(1),
  basedOnTrip: z.string().min(1),
  visibility: VisibilitySchema,
  title: z.string().trim().min(1).max(60),
});

export const publishQuest = action(PublishSchema, async (input, { user, db }) => {
  const [own, profile] = await Promise.all([loadOwnTrip(db, input.key), getMyProfile(user.id)]);
  if (!own || !profile) return { published: false as const, error: 'not_found' as const };
  const { trip, draft } = own;
  const photoFolder = `${user.id}/${input.key}`;

  // Counted from the page as viewers will see it, so it can't drift from the page's robots tag.
  const preview = draftToTripData(
    {
      key: input.key,
      photoFolder,
      visibility: input.visibility,
      savedAt: draft.saved_at_text,
      document: { ...draft.document, title: input.title },
    },
    { handle: profile.handle, name: profile.name, avatar_url: null },
    trip.seed,
    getTemplate(draft.document.templateId).defaults,
  );
  const { data, error } = await db.rpc('publish_trip', {
    p_key: input.key,
    p_based_on_draft: input.basedOnDraft,
    p_based_on_trip: input.basedOnTrip,
    p_visibility: input.visibility,
    p_title: input.title,
    p_slug: firstPublishSlug(input.title, input.visibility),
    p_word_count: countWords(preview),
  });
  const failure = saveError(error);
  if (
    failure === 'conflict' ||
    failure === 'not_found' ||
    failure === 'too_few_photos' ||
    failure === 'too_many_photos'
  ) {
    return { published: false as const, error: failure };
  }
  if (error) throw new Error('Could not publish Quest');

  const result = z.object({ saved_at: z.string(), slug: z.string(), first_publish: z.boolean() }).parse(data);
  refreshQuestPages({
    ownerKey: user.id,
    tripKey: input.key,
    handles: [profile.handle],
    slugs: [result.slug],
  });

  // Removed photos keep their files until now, for Undo; sweep them once the response is sent.
  const keep = [...draft.document.photos.map((photo) => photo.id)];
  after(async () => {
    try {
      const stored = await Promise.all(
        (await listPhotoIds(db, photoFolder))
          .filter((photoId) => !keep.includes(photoId))
          .map(async (photoId) => ({ photoId, createdAt: await photoUploadedAt(db, photoFolder, photoId) })),
      );
      await deletePhotoFiles(db, photoFolder, photosToSweep(stored, keep, new Date()));
    } catch (sweepError) {
      // The Quest is published either way; leftover files are swept on the next publish.
      console.error('Photo sweep failed:', sweepError instanceof Error ? sweepError.name : 'unknown');
    }
  });

  const path = `/@${profile.handle}/${result.slug}`;
  return {
    published: true as const,
    savedAt: result.saved_at,
    path,
    url: absoluteUrl(path),
    firstPublish: result.first_publish,
  };
});

const VisibilityChangeSchema = z.object({
  key: z.uuid(),
  basedOn: z.string().min(1),
  visibility: VisibilitySchema,
});

/** Changing who can see a Quest never changes its link (M28). */
export const setQuestVisibility = action(
  VisibilityChangeSchema,
  async ({ key, basedOn, visibility }, { user, db }) => {
    const [own, profile] = await Promise.all([loadOwnTrip(db, key), getMyProfile(user.id)]);
    if (!own || !profile) return { saved: false as const, error: 'not_found' as const };
    const { data, error } = await db.rpc('set_trip_visibility', {
      p_key: key,
      p_based_on: basedOn,
      p_visibility: visibility,
    });
    const failure = saveError(error);
    if (failure === 'conflict' || failure === 'not_found') return { saved: false as const, error: failure };
    if (error) throw new Error('Could not change visibility');
    refreshQuestPages({ ownerKey: user.id, tripKey: key, handles: [profile.handle], slugs: [own.trip.slug] });
    return { saved: true as const, savedAt: data as string };
  },
);

const CommentsChangeSchema = z.object({ key: z.uuid(), basedOn: z.string().min(1), on: z.boolean() });

/** Comments off hides every comment and blocks new ones (M14). */
export const setQuestComments = action(CommentsChangeSchema, async ({ key, basedOn, on }, { db }) => {
  const { data, error } = await db.rpc('set_trip_comments', { p_key: key, p_based_on: basedOn, p_on: on });
  const failure = saveError(error);
  if (failure === 'conflict' || failure === 'not_found') return { saved: false as const, error: failure };
  if (error) throw new Error('Could not change comments');
  refreshQuestSocial(key);
  return { saved: true as const, savedAt: data as string };
});

/**
 * Files first, then rows: if the rows fail, the Quest still exists and can be deleted again,
 * and no rows are left pointing at deleted files.
 */
export const deleteQuest = action(z.object({ key: z.uuid() }), async ({ key }, { user, db }) => {
  if (!(await loadOwnTrip(db, key))) return { deleted: false as const, error: 'not_found' as const };
  await deleteQuestFiles(db, `${user.id}/${key}`);
  const { data, error } = await db.rpc('delete_trip', { p_key: key });
  if (saveError(error) === 'not_found') return { deleted: false as const, error: 'not_found' as const };
  if (error) throw new Error('Could not delete Quest');
  const removed = z.object({ handles: z.array(z.string()), slug: z.string() }).parse(data);
  refreshQuestPages({ ownerKey: user.id, tripKey: key, handles: removed.handles, slugs: [removed.slug] });
  return { deleted: true as const };
});
