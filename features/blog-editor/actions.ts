'use server';

import { z } from 'zod';
import { blogSaveError } from '@/features/blogs/blogErrors';
import { loadOwnBlog, ownsBlog } from '@/features/blogs/blogRows';
import { action } from '@/lib/action';
import { BlogDocumentSchema } from '@/lib/blog/schema';
import { geocoderFor } from '@/lib/geoServer';
import { deleteQuestFiles } from '@/lib/storage';

// Draft writes for the composer (blogs spec §4.2). Never refresh public caches: readers only see
// a change when it's posted. Domain errors come back in `data`, never thrown.

const SaveDraftSchema = z.object({
  key: z.uuid(),
  /** null on the first save: it creates the blog (both rows, one transaction). */
  basedOn: z.string().min(1).nullable(),
  document: BlogDocumentSchema,
});

/** Autosave. Fails with `conflict` when another tab or device saved first. */
export const saveBlogDraft = action(SaveDraftSchema, async ({ key, basedOn, document }, { db }) => {
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
  return { saved: true as const, savedAt: data as string, created };
});

/** Close on an empty composer: the rows and any uploaded files go. Never a posted blog. */
export const discardBlogDraft = action(z.object({ key: z.uuid() }), async ({ key }, { user, db }) => {
  const own = await loadOwnBlog(db, key);
  if (!own) return { discarded: false as const, error: 'not_found' as const };
  if (own.blog.status === 'published') return { discarded: false as const, error: 'published' as const };
  await deleteQuestFiles(db, `${user.id}/${key}`);
  const { error } = await db.rpc('delete_blog', { p_key: key });
  if (blogSaveError(error) === 'not_found') return { discarded: false as const, error: 'not_found' as const };
  if (error) throw new Error('Could not discard blog');
  return { discarded: true as const };
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
