import { z } from 'zod';
import type { BlogData } from '@/lib/blog/schema';
import type { QuestSocial } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';
import { getBlogSocial } from './getBlogSocial';
import { getLinkedQuest } from './getLinkedQuest';
import { getOwnBlog } from './getOwnBlog';

export type OwnBlogPage =
  | { kind: 'lost' }
  | { kind: 'draft'; key: string }
  | {
      kind: 'posted';
      blog: BlogData;
      social: QuestSocial;
      ownerKey: string;
      linkedQuest: QuestCard | null;
    };

/**
 * The writer's own view of a posted blog at /blogs/[key] (spec §4.4), whatever its visibility:
 * the page a private blog's "Open your blog" and a posted edit land on. Drafts go to the composer.
 * Never cached. Likes and comments exist only on public and unlisted blogs; a private one shows
 * none, with its own comments switch.
 */
export async function getOwnBlogPage(rawKey: string): Promise<OwnBlogPage> {
  const key = z.uuid().safeParse(rawKey);
  if (!key.success) return { kind: 'lost' };
  const own = await getOwnBlog(key.data);
  if (!own) return { kind: 'lost' };
  if (!own.blog) return { kind: 'draft', key: key.data };

  const ownerKey = own.blog.writer.key;
  const [social, linkedQuest] = await Promise.all([
    getBlogSocial(key.data),
    getLinkedQuest(key.data, ownerKey),
  ]);
  return {
    kind: 'posted',
    blog: own.blog,
    // The live row read here is newer than any cache: it decides whether comments are on.
    social: { ...(social ?? EMPTY_SOCIAL), commentsOn: own.commentsOn },
    ownerKey,
    linkedQuest,
  };
}

const EMPTY_SOCIAL: QuestSocial = { likeCount: 0, commentCount: 0, commentsOn: false, comments: [] };
