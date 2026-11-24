import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toNotificationItems } from './notificationRows';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';

/** A like on a blog as list_my_notifications returns it from migration 17. */
const blogLike = {
  key: '9dfbe06b-05c3-4b71-a47c-ffdf45662998',
  kind: 'like',
  like_count: 2,
  unread: true,
  saved_at: '2026-11-24T10:00:00+00:00',
  blog: {
    key: '00000000-0000-4000-8000-0000000000bb',
    title: 'Goa on 15k',
    path: '/@riya/blog/goa-on-15k',
    cover_photo_key: '00000000-0000-4000-8000-0000000000b1',
    photo_folder: 'u/b',
  },
};

describe('toNotificationItems', () => {
  it('reads a follow from someone without a photo (the database leaves avatar_url out)', () => {
    const [item] = toNotificationItems([
      {
        key: '9dfbe06b-05c3-4b71-a47c-ffdf45662999',
        kind: 'follow',
        actor: { name: 'Alok', handle: 'alok' },
        unread: true,
        saved_at: '2026-11-12T13:04:45.356814+00:00',
      },
    ]);
    expect(item?.actor).toEqual({ handle: 'alok', name: 'Alok', avatarUrl: undefined });
  });

  it('reads a blog like, with its cover', () => {
    const [item] = toNotificationItems([blogLike]);
    expect(item).toMatchObject({ kind: 'like', likeCount: 2, blog: { title: 'Goa on 15k', path: '/@riya/blog/goa-on-15k' } });
    expect(item?.quest).toBeUndefined();
    expect(item?.blog?.coverThumb?.endsWith('/photos/u/b/00000000-0000-4000-8000-0000000000b1/thumb.webp')).toBe(true);
  });
});

describe('the previous release (rollback, blogs spec §8)', () => {
  // notificationRows' schema before BL-02, copied: it must still read migration 17's output.
  const OldRowSchema = z.object({
    key: z.uuid(),
    kind: z.enum(['like', 'comment', 'follow']),
    saved_at: z.string(),
    unread: z.boolean(),
    like_count: z.number().int().optional(),
    actor: z.object({ handle: z.string(), name: z.string(), avatar_url: z.string().nullable().optional() }).optional(),
    quest: z
      .object({
        key: z.uuid(),
        title: z.string(),
        path: z.string(),
        cover_photo_key: z.string().optional(),
        photo_folder: z.string(),
      })
      .optional(),
    comment_excerpt: z.string().optional(),
  });

  it('parses a blog row without failing the bell; it just has no Quest (accepted: "your Quest")', () => {
    const [old] = z.array(OldRowSchema).parse([blogLike]);
    expect(old).toMatchObject({ kind: 'like', like_count: 2 });
    expect(old?.quest).toBeUndefined();
    expect(old).not.toHaveProperty('blog');
  });
});
