import { cache } from 'react';
import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';
import { loadOwnBlog } from '@/features/blogs/blogRows';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * The signed-in writer's blog for the composer and the share screen. Null when it isn't theirs
 * or doesn't exist yet (RLS hides other people's rows): /blogs/new makes the rows on first save.
 */
export const getBlogDraft = cache(async (key: string) => {
  const user = await getCurrentUser();
  if (!user) return null;
  const [own, profile] = await Promise.all([
    loadOwnBlog(await createServerSupabase(), key),
    getMyProfile(user.id),
  ]);
  if (!own || !profile) return null;
  const { blog, draft } = own;
  const posted = blog.status === 'published' && blog.slug !== null;
  return {
    key,
    draftSavedAt: draft.saved_at_text,
    blogSavedAt: blog.saved_at_text,
    status: blog.status,
    visibility: blog.visibility,
    published: posted
      ? { slug: blog.slug as string, path: `/@${profile.handle}/blog/${blog.slug}`, visibility: blog.visibility }
      : undefined,
    commentsOn: blog.comments_on,
    ownerHandle: profile.handle,
    ownerName: profile.name,
    ownerKey: user.id,
    photoFolder: `${user.id}/${key}`,
    document: draft.document,
    hasUnpublishedChanges: posted && blog.published_draft_saved_at_text !== draft.saved_at_text,
  };
});

export type BlogDraft = NonNullable<Awaited<ReturnType<typeof getBlogDraft>>>;
