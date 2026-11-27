import { templateCode } from '@/features/trip-page/templateCode';
import {
  CONTENT_TYPE_CODE,
  CREATE_STEP_CODE,
  DRAFT_RESUMED_SOURCE_CODE,
  PREVIEW_EXIT_CODE,
  QUEST_SOURCE_CODE,
} from '@/lib/analytics/codes';
import type { EventProps } from '@/lib/analytics/taxonomy';
import type { PublishAnalytics } from './createEvents';

// Properties of the create flow's later browser events (analytics v2, events.csv): template_select,
// quest_preview, preview_exit, draft_resumed, quest_create_abandoned, and the publishQuest
// `analytics` payload. Codes, counts and keys only. Unknown values are left out, never guessed.

const DAY_MS = 24 * 60 * 60 * 1000;

/** template_select: a template tapped on "Pick a look for your Quest". */
export function templateSelectProperties(
  questKey: string,
  templateId: string,
  previousTemplateId: string,
): EventProps<'template_select'> {
  return { quest_id: questKey, template: templateCode(templateId), prev_template: templateCode(previousTemplateId) };
}

/** quest_preview: Preview opens. */
export function questPreviewProperties(
  questKey: string,
  templateId: string,
  pageCount: number,
): EventProps<'quest_preview'> {
  return { quest_id: questKey, template: templateCode(templateId), page_count: pageCount };
}

/** preview_exit: "Back to edit" or "Publish" on Preview. The cover counts as the first page seen. */
export function previewExitProperties(
  questKey: string,
  action: keyof typeof PREVIEW_EXIT_CODE,
  pagesSeen: number,
): EventProps<'preview_exit'> {
  return { quest_id: questKey, action: PREVIEW_EXIT_CODE[action], pages_seen: Math.max(1, pagesSeen) };
}

/**
 * draft_resumed.source for a draft tile, from the tile's quest_viewed source code: Home's Your
 * Quests or the Quests tab. Anywhere else isn't in the sheet, so nothing is sent.
 */
export function resumedSourceForTile(src: number | undefined): keyof typeof DRAFT_RESUMED_SOURCE_CODE | undefined {
  if (src === QUEST_SOURCE_CODE.your_quests_home) return 'home';
  if (src === QUEST_SOURCE_CODE.quests_tab) return 'quests_tab';
  return undefined;
}

export type Resumed = {
  contentType: 'quest' | 'blog';
  key: string;
  source: keyof typeof DRAFT_RESUMED_SOURCE_CODE;
  /** The draft's saved_at; undefined where the list doesn't have it. */
  savedAt: string | undefined;
  now: Date;
};

/** draft_resumed: "Continue editing" on a draft. */
export function draftResumedProperties(resumed: Resumed): EventProps<'draft_resumed'> {
  const saved = resumed.savedAt ? Date.parse(resumed.savedAt) : Number.NaN;
  const properties = {
    content_type: CONTENT_TYPE_CODE[resumed.contentType],
    content_id: resumed.key,
    source: DRAFT_RESUMED_SOURCE_CODE[resumed.source],
    days_since_last_edit: Number.isNaN(saved)
      ? undefined
      : Math.max(0, Math.floor((resumed.now.getTime() - saved) / DAY_MS)),
  };
  return properties as EventProps<'draft_resumed'>;
}

export type CreateStep = keyof typeof CREATE_STEP_CODE;

export type Abandoned = {
  /** Undefined before Next on Pick photos: there is no draft yet. */
  questKey?: string;
  step: CreateStep;
  photoCount: number;
  /** When the flow started (create_quest_click / Pick photos opening), in ms; undefined if unknown. */
  startedAtMs: number | undefined;
  now: Date;
};

/** quest_create_abandoned: the create flow is left without publishing. */
export function createAbandonedProperties(abandoned: Abandoned): EventProps<'quest_create_abandoned'> {
  const started = abandoned.startedAtMs;
  const properties = {
    quest_id: abandoned.questKey,
    step: CREATE_STEP_CODE[abandoned.step],
    photo_count: abandoned.photoCount,
    seconds_since_start:
      started === undefined || Number.isNaN(started)
        ? undefined
        : Math.max(0, Math.round((abandoned.now.getTime() - started) / 1000)),
  };
  return properties as EventProps<'quest_create_abandoned'>;
}

/** The create step a create-flow path is on, or undefined outside the flow (share, export, …). */
export function createStepForPath(pathname: string, publishSheetOpen: boolean): CreateStep | undefined {
  if (pathname === '/quests/new') return 'pick';
  const match = /^\/quests\/[^/]+\/(arrange|review|template|preview)$/.exec(pathname);
  if (!match) return undefined;
  if (match[1] === 'arrange') return 'arranging';
  if (match[1] === 'review') return 'review';
  if (match[1] === 'template') return 'template';
  return publishSheetOpen ? 'publish_sheet' : 'preview';
}

/**
 * publishQuest's `analytics` (spec §4.3), for quest_creation_complete and quest_updated. The
 * schema drops the whole payload when change types repeat, so they are made unique and sorted.
 * An empty list isn't a valid change_types value, so it is left out.
 */
export function publishAnalytics(
  clickLoc: number | undefined,
  editCount: number,
  changeTypes: number[],
): PublishAnalytics {
  const unique = [...new Set(changeTypes)].sort((a, b) => a - b);
  return { clickLoc, editCount, changeTypes: unique.length > 0 ? unique : undefined };
}
