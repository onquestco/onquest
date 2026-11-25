'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { after } from 'next/server';
import { z } from 'zod';
import { charsBucket, draftSavedProperties, managedProperties } from '@/features/blogs/blogEvents';
import { blogSaveError } from '@/features/blogs/blogErrors';
import { loadOwnBlog, ownsBlog } from '@/features/blogs/blogRows';
import { refreshBlogPages } from '@/features/blogs/refreshBlog';
import { action } from '@/lib/action';
import { trackServer } from '@/lib/analytics/server';
import { BlogDocumentSchema } from '@/lib/blog/schema';
import { geocoderFor } from '@/lib/geoServer';
import { deleteQuestFiles } from '@/lib/storage';
import { shouldTrackDraftSave } from './shouldTrackDraftSave';

// Draft writes for the composer (blogs spec §4.2). Never refresh public caches: readers only see
// a change when it's posted (the one exception: a draft posted elsewhere just before its delete).
// Domain errors come back in `data`, never thrown.

const SaveDraftSchema = z.object({
  key: z.uuid(),
  /** null on the first save: it creates the blog (both rows, one transaction). */
  basedOn: z.string().min(1).nullable(),
  document: BlogDocumentSchema,
});

/** Autosave. Fails with `conflict` when another tab or device saved first. */
export const saveBlogDraft = action(SaveDraftSchema, async ({ key, basedOn, document }, { user, db }) => {
  const created = basedOn === null;
  const { data, error } = created
    ? await db.rpc('create_blog', { p_key: key, p_document: document })
    : await db.rpc('save_blog_draft', { p_key: key, p_based_on: basedOn, p_document: document });
  const failure = blogSaveError(error);
  if (
    failure === 'conflict' ||
    failure === 'not_found' ||
    failure === 'too_many_photos' ||
    failure === 'too_long' ||
    failure === 'no_access' ||
    failure === 'exists'
  ) {
    return { saved: false as const, error: failure };
  }
  if (error) throw new Error('Could not save blog');
  const savedAt = data as string;
  // At most once a calendar minute per blog (spec §10), from the timestamps the database returned.
  if (shouldTrackDraftSave(basedOn, savedAt)) {
    after(() => trackServer('blog_draft_saved', user.id, draftSavedProperties(key, document)));
  }
  return { saved: true as const, savedAt, created };
});

const RemovedSchema = z.object({ handles: z.array(z.string()), slug: z.string().nullable() });

/**
 * A never-posted blog's hard delete (decision 0001 rule 7): files first, as deleteBlog does, then
 * every row and archive. Shared by the empty-composer discard and "Delete draft".
 */
async function deleteUnpostedBlog(db: SupabaseClient, userId: string, key: string) {
  const own = await loadOwnBlog(db, key);
  if (!own) return { error: 'not_found' as const };
  if (own.blog.status === 'published') return { error: 'published' as const };
  await deleteQuestFiles(db, `${userId}/${key}`);
  const { data, error } = await db.rpc('delete_blog', { p_key: key });
  if (blogSaveError(error) === 'not_found') return { error: 'not_found' as const };
  if (error) throw new Error('Could not delete blog draft');
  return { own, removed: RemovedSchema.parse(data) };
}

/** Close on an empty composer: the rows and any uploaded files go. Never a posted blog. */
export const discardBlogDraft = action(z.object({ key: z.uuid() }), async ({ key }, { user, db }) => {
  const result = await deleteUnpostedBlog(db, user.id, key);
  if ('error' in result) return { discarded: false as const, error: result.error };
  return { discarded: true as const };
});

/**
 * ⋯ → "Delete draft" on a blog that was never posted (blogs-editor spec §4.2). A posted blog is
 * refused: it has its own Delete in ManageBlogSheet.
 */
export const deleteBlogDraft = action(z.object({ key: z.uuid() }), async ({ key }, { user, db }) => {
  const result = await deleteUnpostedBlog(db, user.id, key);
  if ('error' in result) return { deleted: false as const, error: result.error };
  const { own, removed } = result;
  if (removed.slug !== null) {
    // Posted on another device between the check and the delete: delete_blog tombstoned it, so
    // this was an ordinary owner delete of a posted blog.
    refreshBlogPages({ ownerKey: user.id, blogKey: key, handles: removed.handles, slugs: [removed.slug] });
    after(() => trackServer('blog_managed', user.id, managedProperties(key, { action: 'delete' })));
    return { deleted: true as const };
  }
  // Never posted: it's on no cached page (public lists show posted blogs only), so no tags.
  const { document } = own.draft;
  after(() =>
    trackServer('blog_deleted', user.id, {
      blog_id: key,
      status: 'draft',
      photos: document.photos.length,
      chars_bucket: charsBucket(document.body),
      has_quest: document.linkedQuestKey !== undefined,
    }),
  );
  return { deleted: true as const };
});

const SearchSchema = z.object({ key: z.uuid(), text: z.string().trim().min(2).max(60) });

/**
 * "Add a place": up to 5 towns. Only the writer of this blog may search (the geocoder is shared
 * and rate limited per person). Over the limit the geocoder answers with no places, as for Quests.
 */
export const searchBlogPlaces = action(SearchSchema, async ({ key, text }, { user, db }) => {
  if (!(await ownsBlog(db, key))) return { found: false as const, error: 'not_found' as const };
  return { found: true as const, places: await geocoderFor(user.id).searchPlaces(text) };
});
