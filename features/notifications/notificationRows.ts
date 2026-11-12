import { z } from 'zod';
import { photoUrls } from '@/lib/storage';
import type { NotificationItem } from '@/lib/social/schema';

// list_my_notifications' snake_case output → NotificationItem[].

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
      quest: row.quest
        ? {
            key: row.quest.key,
            title: row.quest.title,
            path: row.quest.path,
            coverThumb: row.quest.cover_photo_key
              ? photoUrls(row.quest.photo_folder, row.quest.cover_photo_key).thumb
              : undefined,
          }
        : undefined,
      commentExcerpt: row.comment_excerpt,
    }));
}
