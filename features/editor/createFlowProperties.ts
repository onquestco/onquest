import { PHOTO_LIMIT_CODE, PHOTO_LIMIT_SCREEN_CODE, QUEST_EDIT_ACTION_CODE } from '@/lib/analytics/codes';
import type { QuestCreateSource } from '@/lib/analytics/sources';
import type { EventProps } from '@/lib/analytics/taxonomy';
import type { QuestDocument } from '@/lib/trip/schema';
import { clickLocForSource } from './createEvents';

// Properties of the create flow's browser events (analytics v2, docs/analytics/v2/events.csv):
// create_quest_click, photos_selected, photo_limit_hit and quest_edit here; the later screens'
// events in createFlowLaterProperties.ts. Counts, codes and keys only:
// never a title, caption, place name, file name or photo location. A value the screen can't know
// is left out, never guessed: validation reports it by name and the event is still sent (§4.2).

export type CreateClick = {
  source: QuestCreateSource;
  /** The Quest the "Make your own Quest" button was on, when the page knows its key. */
  contentId?: string;
  /** The person has a published Quest; undefined where the screen can't know. */
  hasPublishedQuest?: boolean;
  /** False when the tap opens the sign-in popup first. */
  signedIn: boolean;
};

/** create_quest_click: any way into Pick photos. */
export function createQuestClickProperties(click: CreateClick): EventProps<'create_quest_click'> {
  const properties = {
    click_loc: clickLocForSource(click.source),
    content_id: click.contentId,
    is_first_quest_flg: click.hasPublishedQuest === undefined ? undefined : !click.hasPublishedQuest,
    signed_in_flg: click.signedIn,
  };
  return properties as EventProps<'create_quest_click'>;
}

/** What Pick photos knows about one picked photo. Only flags: the date and place stay on the phone. */
export type PickedSummary = {
  fileName: string;
  failed: boolean;
  /** The photo was read (processed); a failed read has no metadata to count. */
  read: boolean;
  hasDate: boolean;
  hasLocation: boolean;
};

const HEIC = /\.hei[cf]$/i;

/** photos_selected: Next on Pick photos. */
export function photosSelectedProperties(
  questKey: string,
  photos: PickedSummary[],
  pickMs: number,
): EventProps<'photos_selected'> {
  const kept = photos.filter((photo) => !photo.failed && photo.read);
  return {
    quest_id: questKey,
    photo_count: kept.length,
    with_date_count: kept.filter((photo) => photo.hasDate).length,
    with_location_count: kept.filter((photo) => photo.hasLocation).length,
    no_metadata_count: kept.filter((photo) => !photo.hasDate && !photo.hasLocation).length,
    heic_count: photos.filter((photo) => HEIC.test(photo.fileName)).length,
    failed_count: photos.filter((photo) => photo.failed).length,
    pick_time_sec: Math.max(0, Math.round(pickMs / 1000)),
  };
}

/** photo_limit_hit: the 15-photo message, or a remove below 3 refused. No key before Next. */
export function photoLimitProperties(
  limit: keyof typeof PHOTO_LIMIT_CODE,
  screen: keyof typeof PHOTO_LIMIT_SCREEN_CODE,
  questKey?: string,
): EventProps<'photo_limit_hit'> {
  const properties = {
    quest_id: questKey,
    limit: PHOTO_LIMIT_CODE[limit],
    screen: PHOTO_LIMIT_SCREEN_CODE[screen],
  };
  return properties as EventProps<'photo_limit_hit'>;
}

export type QuestEditAction = keyof typeof QUEST_EDIT_ACTION_CODE;

export type QuestEdit = {
  questKey: string;
  action: QuestEditAction;
  /** The document before the edit. */
  before: QuestDocument;
  /** The document after it, or undefined when the edit was refused. */
  after?: QuestDocument;
  /** The photo the edit was about (its page is the page affected). */
  photoId?: string;
  /** The page affected, 0-based, when it isn't the photo's (rename, move to a page). */
  pageIndex?: number;
  isPublished: boolean;
};

/** The 1-based page a photo is on, or undefined. */
function pageOfPhoto(document: QuestDocument, photoId: string): number | undefined {
  const index = document.content.days.findIndex((page) => page.photoIds.includes(photoId));
  return index === -1 ? undefined : index + 1;
}

/** quest_edit: any change on Review, or one that was refused. */
export function questEditProperties(edit: QuestEdit): EventProps<'quest_edit'> {
  const shown = edit.after ?? edit.before;
  const pageNo =
    edit.action === 'title' || edit.action === 'undo'
      ? undefined
      : edit.pageIndex !== undefined
        ? edit.pageIndex + 1
        : edit.photoId
          ? (pageOfPhoto(shown, edit.photoId) ?? pageOfPhoto(edit.before, edit.photoId))
          : undefined;
  const captionWasAuto =
    edit.action === 'caption' && edit.photoId
      ? edit.before.photos.find((photo) => photo.id === edit.photoId)?.captionSource === 'auto'
      : undefined;
  const properties = {
    quest_id: edit.questKey,
    action: QUEST_EDIT_ACTION_CODE[edit.action],
    page_no: pageNo,
    blocked_flg: edit.after === undefined,
    caption_was_auto_flg: captionWasAuto,
    is_published_flg: edit.isPublished,
    photo_count_after: shown.photos.length,
  };
  return properties as EventProps<'quest_edit'>;
}
