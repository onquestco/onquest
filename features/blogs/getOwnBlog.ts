import { getCurrentUser } from '@/features/account/getCurrentUser';
import type { BlogData } from '@/lib/blog/schema';
import { toBlogData } from '@/lib/blog/toBlogData';
import { createServerSupabase } from '@/lib/supabase/server';
import { loadOwnBlog } from './blogRows';

/**
 * The signed-in writer's own blog as posted, whatever its visibility, for the owner view at
 * /blogs/[key] (never cached). Null when it isn't theirs; `blog` is null while it's only a draft.
 */
export async function getOwnBlog(key: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await createServerSupabase();
  const [own, { data: profile, error }] = await Promise.all([
    loadOwnBlog(db, key),
    db.from('profiles').select('handle, name, avatar_url').eq('key', user.id).maybeSingle(),
  ]);
  if (error) throw new Error('Could not load profile');
  if (!own || !profile) return null;
  const { blog, draft } = own;
  const owner = profile as { handle: string; name: string | null; avatar_url: string | null };

  const posted: BlogData | null =
    blog.status === 'published' && blog.slug && blog.title && blog.published_at
      ? toBlogData({
          blog: {
            key,
            slug: blog.slug,
            // Only marks the page unlisted; a private blog reads like a public one to its owner.
            visibility: blog.visibility === 'unlisted' ? 'unlisted' : 'public',
            title: blog.title,
            body: blog.body,
            photos: blog.photos,
            place: blog.place ? { name: blog.place.name } : null,
            comments_on: blog.comments_on,
            word_count: blog.word_count,
            published_at: blog.published_at,
            saved_at: blog.saved_at_text,
          },
          owner: { key: user.id, ...owner },
          photo_folder: `${user.id}/${key}`,
        })
      : null;

  return {
    key,
    status: blog.status,
    visibility: blog.visibility,
    /** The ⋯ menu's conflict token. */
    savedAt: blog.saved_at_text,
    commentsOn: blog.comments_on,
    path: blog.slug ? `/@${owner.handle}/blog/${blog.slug}` : undefined,
    blog: posted,
    hasUnpublishedChanges:
      blog.status === 'published' && blog.published_draft_saved_at_text !== draft.saved_at_text,
  };
}

export type OwnBlog = NonNullable<Awaited<ReturnType<typeof getOwnBlog>>>;
