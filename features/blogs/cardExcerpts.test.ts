import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseBlogBody } from '@/lib/blog/markdown';
import { blogCardFixture as blog } from './blogCardFixture';
import { withOwnExcerpts, withPublicExcerpt, withPublicExcerpts } from './cardExcerpts';

const getBlog = vi.hoisted(() => vi.fn());
vi.mock('./getBlog', () => ({ getBlog }));

const BODY = 'Text\n## Text\nHello im alok';
const RAW = 'Text ## Text Hello im alok'; // the database's joined lines

function fakeDb(result: { data: unknown; error: unknown }) {
  const query = { select: vi.fn(), in: vi.fn() };
  query.select.mockReturnValue(query);
  query.in.mockResolvedValue(result);
  const from = vi.fn().mockReturnValue(query);
  return { db: { from } as unknown as SupabaseClient, from, query };
}

describe('withOwnExcerpts', () => {
  it('builds each excerpt from its draft body', async () => {
    const card = blog(1, { excerpt: RAW });
    const { db, from, query } = fakeDb({ data: [{ key: card.key, body: BODY }], error: null });
    const [result] = await withOwnExcerpts(db, [card]);
    expect(result?.excerpt).toBe('Text Text Hello im alok');
    expect(from).toHaveBeenCalledWith('blog_drafts');
    expect(query.in).toHaveBeenCalledWith('key', [card.key]);
  });

  it('keeps the database excerpt when the bodies cannot load', async () => {
    const card = blog(1, { excerpt: RAW });
    const { db } = fakeDb({ data: null, error: { message: 'down' } });
    expect(await withOwnExcerpts(db, [card])).toEqual([card]);
  });

  it('reads nothing for an empty list', async () => {
    const { db, from } = fakeDb({ data: [], error: null });
    expect(await withOwnExcerpts(db, [])).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});

describe('withPublicExcerpts', () => {
  beforeEach(() => getBlog.mockReset());

  it('builds the excerpt from the posted body, read by the card link', async () => {
    getBlog.mockResolvedValue({ blog: { blocks: parseBlogBody(BODY) } });
    const card = blog(1, { excerpt: RAW });
    const [result] = await withPublicExcerpts([card]);
    expect(result?.excerpt).toBe('Text Text Hello im alok');
    expect(getBlog).toHaveBeenCalledWith('riya', 'goa-on-15k-1');
  });

  it('keeps the database excerpt when the blog is gone or fails to load', async () => {
    const card = blog(1, { excerpt: 'kept' });
    getBlog.mockResolvedValueOnce(null);
    expect((await withPublicExcerpt(card)).excerpt).toBe('kept');
    getBlog.mockRejectedValueOnce(new Error('down'));
    expect((await withPublicExcerpt(card)).excerpt).toBe('kept');
  });

  it('leaves a card without a blog link alone', async () => {
    const card = blog(1, { path: undefined, excerpt: 'kept' });
    expect((await withPublicExcerpt(card)).excerpt).toBe('kept');
    expect(getBlog).not.toHaveBeenCalled();
  });

  it('keeps the rest of a feed item', async () => {
    getBlog.mockResolvedValue({ blog: { blocks: parseBlogBody(BODY) } });
    const item = { ...blog(1), type: 'blog' as const, likedByMe: true };
    expect(await withPublicExcerpt(item)).toEqual({ ...item, excerpt: 'Text Text Hello im alok' });
  });
});
