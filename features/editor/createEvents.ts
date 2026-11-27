import { templateCode } from '@/features/trip-page/templateCode';
import { ARRANGE_MODE_CODE, QUEST_CLICK_LOC_CODE, VISIBILITY_CODE } from '@/lib/analytics/codes';
import type { QuestCreateSource } from '@/lib/analytics/sources';
import type { EventProps } from '@/lib/analytics/taxonomy';
import { MAX_PAGES, PHOTOS_PER_PAGE } from '@/lib/trip/limits';
import type { QuestDocument, Visibility } from '@/lib/trip/schema';

// Properties of the create flow's server events (analytics v2, docs/analytics/v2/events.csv):
// quest_draft_created, quest_arranged, quest_creation_complete, quest_updated. Never the title,
// a caption or a place name: only lengths, counts, codes and keys. A value we can't know is left
// out, never guessed: validation reports it by name and the event is still sent (spec §4.2).

const DAY_MS = 24 * 60 * 60 * 1000;

/** /quests/new's ?source= as click_loc. A new source fails the type check until it has a code. */
const SOURCE_CLICK_LOC: Record<QuestCreateSource, number> = {
  home_banner: QUEST_CLICK_LOC_CODE.home_banner,
  create_menu: QUEST_CLICK_LOC_CODE.create_menu,
  make_your_own: QUEST_CLICK_LOC_CODE.make_your_own,
  // The dashed "+ Create a Quest" tile in Your Quests on Home (YourQuestsRow).
  home_empty: QUEST_CLICK_LOC_CODE.your_quests_tile,
  quests_tab: QUEST_CLICK_LOC_CODE.quests_tab_card,
  quests_empty: QUEST_CLICK_LOC_CODE.empty_state,
  ftue: QUEST_CLICK_LOC_CODE.welcome,
  whatis_sheet: QUEST_CLICK_LOC_CODE.whats_a_quest,
  blog_link: QUEST_CLICK_LOC_CODE.blog_link_quest,
  unavailable_quest: QUEST_CLICK_LOC_CODE.make_your_own_unavailable,
};

export function clickLocForSource(source: QuestCreateSource): number {
  return SOURCE_CLICK_LOC[source];
}

/** Whole days since an ISO time, or undefined when there isn't one. */
function daysSince(iso: string | null | undefined, now: Date): number | undefined {
  const then = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(then) ? undefined : Math.max(0, Math.floor((now.getTime() - then) / DAY_MS));
}

/** quest_draft_created: the draft row exists (Next on Pick photos). */
export function draftCreatedProperties(
  questKey: string,
  source: QuestCreateSource,
): EventProps<'quest_draft_created'> {
  return { quest_id: questKey, click_loc: clickLocForSource(source) };
}

/**
 * Which of arrangePages' rules (arrange.ts) shaped the draft, read back from the photos' trip days.
 * A failed arrange leaves the photos in pick order with no days.
 */
export function arrangeMode(document: QuestDocument, failed: boolean): number {
  const days = document.photos.map((photo) => photo.date);
  const datedDays = days.filter((day): day is string => day !== undefined);
  if (failed || datedDays.length === 0) return ARRANGE_MODE_CODE.pick_order;
  if (datedDays.length < days.length) return ARRANGE_MODE_CODE.mixed;
  const photosPerDay = new Map<string, number>();
  for (const day of datedDays) photosPerDay.set(day, (photosPerDay.get(day) ?? 0) + 1);
  if (photosPerDay.size === 1) {
    return datedDays.length > PHOTOS_PER_PAGE
      ? ARRANGE_MODE_CODE.day_split_by_time
      : ARRANGE_MODE_CODE.page_per_day;
  }
  const pagesByDay = [...photosPerDay.values()].reduce(
    (sum, count) => sum + Math.ceil(count / PHOTOS_PER_PAGE),
    0,
  );
  return pagesByDay > MAX_PAGES ? ARRANGE_MODE_CODE.chapters : ARRANGE_MODE_CODE.page_per_day;
}

export type ArrangedReport = {
  pages: number;
  photos: number;
  captionsWritten: number;
  failed: boolean;
  durationMs: number;
};

/** quest_arranged: counts from the client's report, mode and places from the stored draft. */
export function arrangedProperties(
  questKey: string,
  report: ArrangedReport,
  document: QuestDocument,
): EventProps<'quest_arranged'> {
  return {
    quest_id: questKey,
    photo_count: report.photos,
    page_count: report.pages,
    arrange_mode: arrangeMode(document, report.failed),
    place_count: new Set(document.places.map((place) => place.name)).size,
    captions_auto_count: report.captionsWritten,
    failed_flg: report.failed,
    duration_ms: report.durationMs,
  };
}

/** What the browser passes with Publish (publishQuest.analytics, spec §4.3). */
export type PublishAnalytics = { clickLoc?: number; editCount?: number; changeTypes?: number[] };

export type FirstPublishFacts = {
  title: string;
  visibility: Visibility;
  /** Settings "New Quests start as"; undefined if it couldn't be read. */
  defaultVisibility: Visibility | undefined;
  /** The owner has another published Quest; undefined if it couldn't be read. */
  hasOtherPublishedQuest: boolean | undefined;
  signedUpAt: string | undefined;
  analytics: PublishAnalytics | undefined;
  now: Date;
};

/** quest_creation_complete: the first publish. */
export function creationCompleteProperties(
  questKey: string,
  document: QuestDocument,
  facts: FirstPublishFacts,
): EventProps<'quest_creation_complete'> {
  const captioned = document.photos.filter((photo) => photo.caption);
  const autoKept = captioned.filter((photo) => photo.captionSource === 'auto').length;
  const started = document.startedAt ? Date.parse(document.startedAt) : Number.NaN;
  const properties = {
    quest_id: questKey,
    title_length: [...facts.title].length,
    visibility: VISIBILITY_CODE[facts.visibility],
    default_visibility: facts.defaultVisibility ? VISIBILITY_CODE[facts.defaultVisibility] : undefined,
    template: templateCode(document.templateId),
    photo_count: document.photos.length,
    page_count: document.content.days.length,
    edit_count: facts.analytics?.editCount,
    captions_auto_kept: autoKept,
    captions_user_written: captioned.length - autoKept,
    minutes_since_start: Number.isNaN(started)
      ? undefined
      : Math.round((Math.max(0, facts.now.getTime() - started) / 60_000) * 10) / 10,
    click_loc: facts.analytics?.clickLoc,
    is_first_quest_flg:
      facts.hasOtherPublishedQuest === undefined ? undefined : !facts.hasOtherPublishedQuest,
    days_since_signup: daysSince(facts.signedUpAt, facts.now),
  };
  // Old bundles send no analytics and old drafts have no startedAt: those are left out (spec §8).
  return properties as EventProps<'quest_creation_complete'>;
}

export type RepublishFacts = {
  visibility: Visibility;
  /** The template the live Quest had before this publish; undefined if it couldn't be read. */
  previousTemplateId: string | undefined;
  firstPublishedAt: string | null;
  analytics: PublishAnalytics | undefined;
  now: Date;
};

/** quest_updated: a published Quest published again. */
export function questUpdatedProperties(
  questKey: string,
  document: QuestDocument,
  facts: RepublishFacts,
): EventProps<'quest_updated'> {
  const changeTypes = [...new Set(facts.analytics?.changeTypes ?? [])].sort(
    (first, second) => first - second,
  );
  const properties = {
    quest_id: questKey,
    // An empty list isn't a valid value: no edits (or an old bundle) leaves it out.
    change_types: changeTypes.length > 0 ? changeTypes.join(',') : undefined,
    template_changed_flg:
      facts.previousTemplateId === undefined ? undefined : facts.previousTemplateId !== document.templateId,
    visibility: VISIBILITY_CODE[facts.visibility],
    days_since_publish: daysSince(facts.firstPublishedAt, facts.now),
  };
  return properties as EventProps<'quest_updated'>;
}
