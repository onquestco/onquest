import { z } from 'zod';
import { photoUrls } from '@/lib/storage';
import type { NotificationItem } from '@/lib/social/schema';

// list_my_notifications' snake_case output → NotificationItem[]. A like or comment is about a
// Quest (quest) or, from migration 17, a blog (blog).

const SubjectRowSchema = z.object({
  key: z.uuid(),
  title: z.string(),
  path: z.string(),
  cover_photo_key: z.string().optional(),
  photo_folder: z.string(),
});

function toSubject(row: z.infer<typeof SubjectRowSchema> | undefined) {
  if (!row) return undefined;
  return {
    key: row.key,
    title: row.title,
    path: row.path,
    coverThumb: row.cover_photo_key ? photoUrls(row.photo_folder, row.cover_photo_key).thumb : undefined,
  };
}

const RowSchema = z.object({
  key: z.uuid(),
  kind: z.enum(['like', 'comment', 'follow']),
  saved_at: z.string(),
  unread: z.boolean(),
  like_count: z.number().int().optional(),
  // The database leaves avatar_url out when there is none (null fields are stripped).
  actor: z
    .object({ handle: z.string(), name: z.string(), avatar_url: z.string().nullable().optional() })
    .optional(),
  quest: SubjectRowSchema.optional(),
  blog: SubjectRowSchema.optional(),
  comment_excerpt: z.string().optional(),
});

export function toNotificationItems(raw: unknown): NotificationItem[] {
  return z
    .array(RowSchema)
    .parse(raw)
    .map((row) => ({
      key: row.key,
      kind: row.kind,
      savedAt: row.saved_at,
      unread: row.unread,
      likeCount: row.like_count,
      actor: row.actor
        ? { handle: row.actor.handle, name: row.actor.name, avatarUrl: row.actor.avatar_url ?? undefined }
        : undefined,
      quest: toSubject(row.quest),
      blog: toSubject(row.blog),
      commentExcerpt: row.comment_excerpt,
    }));
}
