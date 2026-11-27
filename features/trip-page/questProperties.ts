import {
  CONTENT_TYPE_CODE,
  FULLSCREEN_VIA_CODE,
  PAGE_TURN_DIRECTION_CODE,
  PAGE_TURN_VIA_CODE,
  QUEST_PHOTO_ACTION_CODE,
  QUEST_SOURCE_CODE,
  REFERRER_CODE,
  UNAVAILABLE_REASON_CODE,
  VIEW_EXIT_CODE,
  VISIBILITY_CODE,
} from '@/lib/analytics/codes';
import type { Src } from '@/lib/analytics/src';
import type { EventProps } from '@/lib/analytics/taxonomy';
import type { ViewerState } from '@/lib/social/schema';
import type { BlogReferrer } from '@/features/blogs/blogReferrer';
import type { MemorySheetAction } from '@/templates/shared/MemorySheet';
import type { PageTurn } from '@/templates/shared/QuestPlayer';

// The Quest page's analytics (docs/specs/analytics-v2.md, AN-05): pure property builders, and the
// reading progress quest_view_ended reports. Codes only: keys, counts and flags, never user text.

/**
 * quest_viewed.source. An in-app link's ?src= code; ?src=email is a notification email. With no
 * tag, a page the browser opened directly is a shared link, and an untagged in-app link is left
 * out (the property is optional for that reason).
 */
export function questSourceFor(src: Src | null, landing: boolean): number | undefined {
  if (src === 'email') return QUEST_SOURCE_CODE.notification;
  if (typeof src === 'number') {
    const known: number[] = Object.values(QUEST_SOURCE_CODE);
    return known.includes(src) ? src : undefined;
  }
  return landing ? QUEST_SOURCE_CODE.shared_link : undefined;
}

export type QuestViewFacts = {
  unlisted: boolean;
  /** templateCode() in templateCode.ts, worked out on the server so no template reaches the browser. */
  template: number;
  /** Photo pages only (no cover, no route page). */
  pageCount: number;
};

export function questViewedProperties(input: {
  questKey: string;
  ownerKey: string;
  viewer: ViewerState;
  facts: QuestViewFacts;
  source: number | undefined;
  referrer: BlogReferrer;
  loadTimeMs: number;
}): EventProps<'quest_viewed'> {
  return {
    quest_id: input.questKey,
    owner_user_id: input.ownerKey,
    is_owner_flg: input.viewer.isOwner,
    signed_in_flg: input.viewer.signedIn,
    // The public page only ever shows public and unlisted Quests.
    visibility: input.facts.unlisted ? VISIBILITY_CODE.unlisted : VISIBILITY_CODE.public,
    source: input.source,
    referrer: REFERRER_CODE[input.referrer],
    follows_owner_flg: input.viewer.followingOwner,
    template: input.facts.template,
    page_count: input.facts.pageCount,
    load_time_ms: Math.max(0, Math.round(input.loadTimeMs)),
  };
}

export function questUnavailableProperties(
  reason: keyof typeof UNAVAILABLE_REASON_CODE,
  signedIn: boolean,
): EventProps<'quest_unavailable'> {
  // No quest_id: the cached page knows only the link, never the Quest behind it.
  return { reason: UNAVAILABLE_REASON_CODE[reason], signed_in_flg: signedIn };
}

/** Went from the last page on to the cover. */
export const isLoop = (turn: PageTurn) =>
  turn.direction === 'next' && turn.from === turn.count - 1 && turn.to === 0;

export function pageTurnProperties(questKey: string, turn: PageTurn): EventProps<'quest_page_turn'> {
  return {
    quest_id: questKey,
    page_no: turn.to,
    total_pages: turn.count,
    direction: PAGE_TURN_DIRECTION_CODE[turn.direction],
    via: PAGE_TURN_VIA_CODE[turn.via],
    looped_flg: isLoop(turn),
    fullscreen_flg: turn.fullscreen,
  };
}

export function fullscreenProperties(
  questKey: string,
  on: boolean,
  via: keyof typeof FULLSCREEN_VIA_CODE,
): EventProps<'quest_fullscreen'> {
  return { quest_id: questKey, on_flg: on, via: FULLSCREEN_VIA_CODE[via] };
}

/** page_no is the Quest page the sheet was opened from. */
export function photoClickProperties(
  questKey: string,
  action: MemorySheetAction,
  pageNo: number,
): EventProps<'quest_photo_click'> {
  return { quest_id: questKey, action: QUEST_PHOTO_ACTION_CODE[action], page_no: pageNo };
}

export function reportClickProperties(questKey: string): EventProps<'report_click'> {
  return { content_type: CONTENT_TYPE_CODE.quest, content_id: questKey };
}

// Reading progress ------------------------------------------------------------------------------

export type Reading = { page: number; seen: number[]; completed: boolean; loops: number };

export function startReading(totalPages: number): Reading {
  return { page: 0, seen: [0], completed: totalPages <= 1, loops: 0 };
}

/** "Completed" is reaching the last page: the route page, or the last photo page when there's none. */
export function afterTurn(reading: Reading, turn: PageTurn): Reading {
  return {
    page: turn.to,
    seen: reading.seen.includes(turn.to) ? reading.seen : [...reading.seen, turn.to],
    completed: reading.completed || turn.to === turn.count - 1,
    loops: reading.loops + (isLoop(turn) ? 1 : 0),
  };
}

export function viewEndedProperties(
  questKey: string,
  reading: Reading,
  visibleMs: number,
  exit: keyof typeof VIEW_EXIT_CODE,
): EventProps<'quest_view_ended'> {
  return {
    quest_id: questKey,
    seconds: Math.max(0, Math.round(visibleMs / 1000)),
    pages_seen: reading.seen.length,
    completed_flg: reading.completed,
    loops: reading.loops,
    exit_type: VIEW_EXIT_CODE[exit],
  };
}

/** A link that leaves the Quest for "Make your own Quest" (straight, or through sign-in first). */
export function isMakeYourOwnHref(href: string, origin: string): boolean {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin) return false;
    if (url.pathname === '/quests/new') return true;
    return url.pathname === '/login' && url.searchParams.get('intent') === 'make_your_own';
  } catch {
    return false;
  }
}
