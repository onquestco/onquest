import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { BlogCard } from '@/lib/blog/cards';
import { blogExcerpt, blogExcerptFromBlocks } from '@/lib/blog/excerpt';
import { getBlog } from './getBlog';

// Card excerpts built from the body (lib/blog/excerpt.ts), so cards never show "##", "- " or ">".
// If a body can't be read, the card keeps the database's excerpt (already cleaned of inline
// markers in toBlogCards): a card with a slightly rough line beats a list that fails to load.

const BLOG_PATH = /^\/@([^/]+)\/blog\/([^/]+)$/;

const DraftBodySchema = z.array(z.object({ key: z.uuid(), body: z.string() }));

/** Your own cards (drafts included): the excerpt from each draft's body, read through RLS. */
export async function withOwnExcerpts(db: SupabaseClient, cards: BlogCard[]): Promise<BlogCard[]> {
  if (cards.length === 0) return cards;
  const keys = cards.map((card) => card.key);
  const { data, error } = await db.from('blog_drafts').select('key, body').in('key', keys);
  if (error) return cards;
  const parsed = DraftBodySchema.safeParse(data);
  if (!parsed.success) return cards;
  const bodies = new Map(parsed.data.map((row) => [row.key, row.body]));
  return cards.map((card) => {
    const body = bodies.get(card.key);
    return body === undefined ? card : { ...card, excerpt: blogExcerpt(body) };
  });
}

/**
 * Public cards (profile, feed, Explore, search): the excerpt from the posted body, through
 * getBlog, which is cached per blog URL and refreshed whenever the blog changes.
 */
export async function withPublicExcerpts<Card extends BlogCard>(cards: Card[]): Promise<Card[]> {
  return Promise.all(cards.map(withPublicExcerpt));
}

/** One public card, for lists that mix blogs with Quests (the Home feed). */
export async function withPublicExcerpt<Card extends BlogCard>(card: Card): Promise<Card> {
  const match = card.path ? BLOG_PATH.exec(card.path) : null;
  const handle = match?.[1];
  const slug = match?.[2];
  if (!handle || !slug) return card;
  try {
    const found = await getBlog(handle, slug);
    return found ? { ...card, excerpt: blogExcerptFromBlocks(found.blog.blocks) } : card;
  } catch {
    return card;
  }
}
