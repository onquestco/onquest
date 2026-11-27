import type { SupabaseClient, User } from '@supabase/supabase-js';
import { z } from 'zod';
import { trackServer } from '@/lib/analytics/server';
import { ProfileSettingsSchema } from '@/lib/profile/schema';
import type { QuestDocument, Visibility } from '@/lib/trip/schema';
import { creationCompleteProperties, questUpdatedProperties, type PublishAnalytics } from './createEvents';

// quest_creation_complete and quest_updated, sent by publishQuest inside after(), and the small
// owner-only reads (RLS) they need. Each read answers undefined instead of throwing: analytics
// never fails or slows a publish (spec §7).

/** The live Quest's template before this publish (null for a draft that was never published). */
export async function publishedTemplateId(
  db: SupabaseClient,
  questKey: string,
): Promise<string | null | undefined> {
  try {
    const { data, error } = await db
      .from('trips')
      .select('template_id')
      .eq('key', questKey)
      .eq('status', 'published')
      .maybeSingle();
    if (error) return undefined;
    return data ? z.object({ template_id: z.string() }).parse(data).template_id : null;
  } catch {
    return undefined;
  }
}

/** Whether the owner has a published Quest other than this one. */
export async function hasOtherPublishedQuest(
  db: SupabaseClient,
  ownerKey: string,
  questKey: string,
): Promise<boolean | undefined> {
  try {
    const { count, error } = await db
      .from('trips')
      .select('key', { count: 'exact', head: true })
      .eq('owner_key', ownerKey)
      .eq('status', 'published')
      .neq('key', questKey);
    return error || count === null ? undefined : count > 0;
  } catch {
    return undefined;
  }
}

/** Settings "New Quests start as" (defaults applied as on the Settings screen). */
export async function defaultVisibility(
  db: SupabaseClient,
  ownerKey: string,
): Promise<Visibility | undefined> {
  try {
    const { data, error } = await db.from('profiles').select('settings').eq('key', ownerKey).maybeSingle();
    if (error || !data) return undefined;
    return ProfileSettingsSchema.parse((data as { settings: unknown }).settings ?? {}).defaultVisibility;
  } catch {
    return undefined;
  }
}

export type PublishEvent = {
  user: Pick<User, 'id' | 'created_at'>;
  questKey: string;
  firstPublish: boolean;
  /** The draft that was published. */
  document: QuestDocument;
  title: string;
  visibility: Visibility;
  analytics: PublishAnalytics | undefined;
  /** From publishedTemplateId(), read before the publish. */
  previousTemplateId: string | null | undefined;
  /** trips.published_at before this publish: the first publish time. */
  firstPublishedAt: string | null;
  now: Date;
};

/** quest_creation_complete on the first publish, quest_updated on every later one. */
export async function sendPublishEvent(db: SupabaseClient, event: PublishEvent): Promise<void> {
  const { user, questKey, document, analytics, now } = event;
  if (!event.firstPublish) {
    await trackServer(
      'quest_updated',
      user.id,
      questUpdatedProperties(questKey, document, {
        visibility: event.visibility,
        previousTemplateId: event.previousTemplateId ?? undefined,
        firstPublishedAt: event.firstPublishedAt,
        analytics,
        now,
      }),
    );
    return;
  }
  const [startVisibility, otherPublished] = await Promise.all([
    defaultVisibility(db, user.id),
    hasOtherPublishedQuest(db, user.id, questKey),
  ]);
  await trackServer(
    'quest_creation_complete',
    user.id,
    creationCompleteProperties(questKey, document, {
      title: event.title,
      visibility: event.visibility,
      defaultVisibility: startVisibility,
      hasOtherPublishedQuest: otherPublished,
      signedUpAt: user.created_at,
      analytics,
      now,
    }),
  );
}
