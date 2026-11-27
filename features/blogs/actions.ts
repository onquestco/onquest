'use server';

import { after } from 'next/server';
import { z } from 'zod';
import { getMyProfile } from '@/features/account/getCurrentUser';
import { photosToSweep } from '@/features/editor/photoSweep';
import { action } from '@/lib/action';
import { trackServer } from '@/lib/analytics/server';
import { deletePhotoFiles, deleteQuestFiles, listPhotoIds, photoUploadedAt } from '@/lib/storage';
import { VisibilitySchema } from '@/lib/trip/schema';
import { blogSaveError } from './blogErrors';
import {
  commentsToggledProperties,
  postedDeletedProperties,
  publishedProperties,
  updatedProperties,
  visibilityChangedProperties,
} from './blogEvents';
import { loadOwnBlog } from './blogRows';
import { firstBlogSlug } from './blogSlug';
import { refreshBlogPages, refreshBlogSocial } from './refreshBlog';

// Posting and the ⋯ menu (blogs spec §4.2). Every change to the live row passes the saved_at it
// was based on; a stale tab gets `conflict`. Domain errors come back in `data`, never thrown.

const PublishSchema = z.object({
  key: z.uuid(),
  basedOnDraft: z.string().min(1),
  basedOnBlog: z.string().min(1),
  /** Chosen on the first Post; null keeps the current one on later Posts. */
  visibility: VisibilitySchema.nullable(),
});

export const publishBlog = action(PublishSchema, async (input, { user, db }) => {
  const [own, profile] = await Promise.all([loadOwnBlog(db, input.key), getMyProfile(user.id)]);
  if (!own || !profile) return { published: false as const, error: 'not_found' as const };
  const { blog, draft } = own;
  const photoFolder = `${user.id}/${input.key}`;

  const { data, error } = await db.rpc('publish_blog', {
    p_key: input.key,
    p_based_on_draft: input.basedOnDraft,
    p_based_on_blog: input.basedOnBlog,
    p_visibility: input.visibility,
    // Only used on the first Post; the database keeps the slug after that.
    p_slug: firstBlogSlug(draft.document.title?.trim() ?? '', input.visibility ?? blog.visibility),
  });
  const failure = blogSaveError(error);
  if (
    failure === 'conflict' ||
    failure === 'not_found' ||
    failure === 'empty' ||
    failure === 'invalid_visibility'
  ) {
    return { published: false as const, error: failure };
  }
  if (error) throw new Error('Could not publish blog');

  const result = z.object({ saved_at: z.string(), slug: z.string(), first_publish: z.boolean() }).parse(data);
  refreshBlogPages({ ownerKey: user.id, blogKey: input.key, handles: [profile.handle], slugs: [result.slug] });
  const visibility = input.visibility ?? blog.visibility;
  // blog_published on the first Post, blog_updated on every later one.
  const postedAt = new Date();
  after(() =>
    result.first_publish
      ? trackServer('blog_published', user.id, publishedProperties(input.key, draft.document, visibility, postedAt))
      : trackServer('blog_updated', user.id, updatedProperties(input.key)),
  );

  // Removed photos keep their files until now; sweep them once the response is sent. Publishing
  // leaves the draft as it was, so its photos are exactly what both rows now use.
  const keep = draft.document.photos.map((photo) => photo.id);
  after(async () => {
    try {
      const stored = await Promise.all(
        (await listPhotoIds(db, photoFolder))
          .filter((photoId) => !keep.includes(photoId))
          .map(async (photoId) => ({ photoId, createdAt: await photoUploadedAt(db, photoFolder, photoId) })),
      );
      await deletePhotoFiles(db, photoFolder, photosToSweep(stored, keep, new Date()));
    } catch (sweepError) {
      // The blog is posted either way; leftover files are swept on the next Post.
      console.error('Photo sweep failed:', sweepError instanceof Error ? sweepError.name : 'unknown');
    }
  });

  return {
    published: true as const,
    savedAt: result.saved_at,
    slug: result.slug,
    path: `/@${profile.handle}/blog/${result.slug}`,
    firstPublish: result.first_publish,
  };
});

const VisibilityChangeSchema = z.object({
  key: z.uuid(),
  basedOn: z.string().min(1),
  visibility: VisibilitySchema,
});

/** Who can see a posted blog. Its link never changes. */
export const setBlogVisibility = action(
  VisibilityChangeSchema,
  async ({ key, basedOn, visibility }, { user, db }) => {
    const [own, profile] = await Promise.all([loadOwnBlog(db, key), getMyProfile(user.id)]);
    if (!own || !profile) return { saved: false as const, error: 'not_found' as const };
    const { data, error } = await db.rpc('set_blog_visibility', {
      p_key: key,
      p_based_on: basedOn,
      p_visibility: visibility,
    });
    const failure = blogSaveError(error);
    if (failure === 'conflict' || failure === 'not_found' || failure === 'not_published') {
      return { saved: false as const, error: failure };
    }
    if (error) throw new Error('Could not change visibility');
    after(() => trackServer('visibility_changed', user.id, visibilityChangedProperties(key, visibility)));
    refreshBlogPages({
      ownerKey: user.id,
      blogKey: key,
      handles: [profile.handle],
      slugs: own.blog.slug ? [own.blog.slug] : [],
    });
    return { saved: true as const, savedAt: data as string };
  },
);

const CommentsChangeSchema = z.object({ key: z.uuid(), basedOn: z.string().min(1), on: z.boolean() });

/** Comments off hides every comment and blocks new ones. */
export const setBlogComments = action(CommentsChangeSchema, async ({ key, basedOn, on }, { user, db }) => {
  const { data, error } = await db.rpc('set_blog_comments', { p_key: key, p_based_on: basedOn, p_on: on });
  const failure = blogSaveError(error);
  if (failure === 'conflict' || failure === 'not_found') return { saved: false as const, error: failure };
  if (error) throw new Error('Could not change comments');
  refreshBlogSocial(key);
  after(() => trackServer('comments_toggled', user.id, commentsToggledProperties(key, on)));
  return { saved: true as const, savedAt: data as string };
});

/**
 * Files first, then rows: if the rows fail, the blog still exists and can be deleted again, and no
 * rows are left pointing at deleted files (the deleteQuest order).
 */
export const deleteBlog = action(z.object({ key: z.uuid() }), async ({ key }, { user, db }) => {
  if (!(await loadOwnBlog(db, key))) return { deleted: false as const, error: 'not_found' as const };
  await deleteQuestFiles(db, `${user.id}/${key}`);
  const { data, error } = await db.rpc('delete_blog', { p_key: key });
  if (blogSaveError(error) === 'not_found') return { deleted: false as const, error: 'not_found' as const };
  if (error) throw new Error('Could not delete blog');
  const removed = z.object({ handles: z.array(z.string()), slug: z.string().nullable() }).parse(data);
  refreshBlogPages({
    ownerKey: user.id,
    blogKey: key,
    handles: removed.handles,
    slugs: removed.slug ? [removed.slug] : [],
  });
  after(() => trackServer('content_deleted', user.id, postedDeletedProperties(key)));
  return { deleted: true as const };
});
