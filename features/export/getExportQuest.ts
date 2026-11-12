import { getQuestDraft } from '@/features/editor/getQuestDraft';
import { loadPublishedDocument } from '@/features/editor/questRows';
import { createServerSupabase } from '@/lib/supabase/server';
import { draftToTripData } from '@/lib/trip/toTripData';
import { getTemplate } from '@/templates/registry';

/**
 * The owner's published Quest, as viewers see it, for "Download for Instagram" (spec B §3.7).
 * From the published row, not the draft: the images show what the link opens. Null when it isn't
 * the signed-in person's, or isn't published.
 */
export async function getExportQuest(key: string) {
  const draft = await getQuestDraft(key);
  if (!draft || draft.status !== 'published' || !draft.slug) return null;
  const document = await loadPublishedDocument(await createServerSupabase(), key);
  if (!document) return null;
  const template = getTemplate(document.templateId);
  const trip = draftToTripData(
    {
      key,
      slug: draft.slug,
      photoFolder: draft.photoFolder,
      visibility: draft.visibility,
      savedAt: draft.tripSavedAt,
      document,
    },
    { handle: draft.ownerHandle, name: draft.ownerName, avatar_url: null },
    draft.seed,
    template.defaults,
  );
  return { trip, templateId: template.id };
}
