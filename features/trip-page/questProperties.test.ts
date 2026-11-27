import { describe, expect, it, vi } from 'vitest';
import { QUEST_SOURCE_CODE, TEMPLATE_CODE } from '@/lib/analytics/codes';
import { expectNoProblems } from '@/lib/analytics/validate';
import { templates } from '@/templates/registry';
import type { PageTurn } from '@/templates/shared/QuestPlayer';
import {
  afterTurn,
  fullscreenProperties,
  isMakeYourOwnHref,
  pageTurnProperties,
  photoClickProperties,
  questSourceFor,
  questUnavailableProperties,
  questViewedProperties,
  reportClickProperties,
  startReading,
  viewEndedProperties,
} from './questProperties';
import { looksSignedIn } from './signedInHint';
import { templateCode } from './templateCode';

// The registry loads every template, and with it next/font.
vi.mock('next/font/google', () => import('@/templates/shared/nextFontStub'));

const questKey = '00000000-0000-4000-8000-0000000000aa';
const ownerKey = '00000000-0000-4000-8000-0000000000bb';
const viewer = { signedIn: true, liked: false, isOwner: false, followingOwner: true };
const turn = (from: number, to: number, overrides: Partial<PageTurn> = {}): PageTurn => ({
  from,
  to,
  count: 4,
  direction: 'next',
  via: 'tap',
  fullscreen: false,
  ...overrides,
});

describe('quest_viewed', () => {
  const base = {
    questKey,
    ownerKey,
    viewer,
    facts: { unlisted: false, template: TEMPLATE_CODE.coastal, pageCount: 2 },
    source: QUEST_SOURCE_CODE.home_feed,
    referrer: 'none' as const,
    loadTimeMs: 812.4,
  };

  it('fills every required property', () => {
    expectNoProblems('quest_viewed', questViewedProperties(base));
    expect(questViewedProperties(base)).toMatchObject({
      quest_id: questKey,
      owner_user_id: ownerKey,
      is_owner_flg: false,
      signed_in_flg: true,
      visibility: 0,
      source: 1,
      referrer: 0,
      follows_owner_flg: true,
      template: 0,
      page_count: 2,
      load_time_ms: 812,
    });
  });

  it('sends owners and unlisted Quests too, and an untagged in-app link without a source', () => {
    const properties = questViewedProperties({
      ...base,
      viewer: { ...viewer, isOwner: true },
      facts: { ...base.facts, unlisted: true },
      source: undefined,
      referrer: 'whatsapp',
    });
    expectNoProblems('quest_viewed', properties);
    expect(properties).toMatchObject({ is_owner_flg: true, visibility: 1, referrer: 1 });
    expect(properties.source).toBeUndefined();
  });
});

describe('questSourceFor', () => {
  it('uses the link tag, email as Notification, and Shared link only for a direct open', () => {
    expect(questSourceFor(QUEST_SOURCE_CODE.profile, false)).toBe(5);
    expect(questSourceFor('email', true)).toBe(QUEST_SOURCE_CODE.notification);
    expect(questSourceFor(null, true)).toBe(QUEST_SOURCE_CODE.shared_link);
    expect(questSourceFor(null, false)).toBeUndefined();
    expect(questSourceFor(42, true)).toBeUndefined();
  });
});

describe('templateCode', () => {
  it('has a code for every template, and counts an unknown id as Beach (what renders)', () => {
    expect(Object.keys(TEMPLATE_CODE).sort()).toEqual(Object.keys(templates).sort());
    for (const id of Object.keys(templates))
      expect(templateCode(id)).toBe(TEMPLATE_CODE[id as keyof typeof TEMPLATE_CODE]);
    expect(templateCode('nope')).toBe(TEMPLATE_CODE.beach);
    expect(templateCode('toString')).toBe(TEMPLATE_CODE.beach);
  });
});

describe('quest_unavailable', () => {
  it('sends the reason and the signed-in hint, never a key', () => {
    expectNoProblems('quest_unavailable', questUnavailableProperties('private', true));
    expect(questUnavailableProperties('removed', false)).toEqual({ reason: 1, signed_in_flg: false });
  });

  it('reads the hint from the Supabase auth cookie only', () => {
    expect(looksSignedIn('a=1; sb-abc-auth-token.0=xyz')).toBe(true);
    expect(looksSignedIn('sb-abc-auth-token=xyz')).toBe(true);
    expect(looksSignedIn('oq_actx=v1.x; other=sb-abc-auth-token')).toBe(false);
  });
});

describe('quest_page_turn', () => {
  it('fills every required property, with the loop from the last page to the cover', () => {
    expectNoProblems('quest_page_turn', pageTurnProperties(questKey, turn(0, 1)));
    expect(pageTurnProperties(questKey, turn(3, 0, { via: 'swipe', fullscreen: true }))).toEqual({
      quest_id: questKey,
      page_no: 0,
      total_pages: 4,
      direction: 0,
      via: 1,
      looped_flg: true,
      fullscreen_flg: true,
    });
    // Back from the cover to the last page isn't a loop.
    expect(pageTurnProperties(questKey, turn(0, 3, { direction: 'previous', via: 'key' }))).toMatchObject({
      direction: 1,
      via: 2,
      looped_flg: false,
    });
  });
});

describe('quest_fullscreen, quest_photo_click, report_click', () => {
  it('fill every required property', () => {
    expectNoProblems('quest_fullscreen', fullscreenProperties(questKey, true, 'button'));
    expect(fullscreenProperties(questKey, false, 'escape')).toEqual({
      quest_id: questKey,
      on_flg: false,
      via: 1,
    });
    expectNoProblems('quest_photo_click', photoClickProperties(questKey, 'open', 1));
    expect(photoClickProperties(questKey, 'map', 2)).toEqual({ quest_id: questKey, action: 3, page_no: 2 });
    expectNoProblems('report_click', reportClickProperties(questKey));
    expect(reportClickProperties(questKey)).toEqual({ content_type: 0, content_id: questKey });
  });
});

describe('quest_view_ended', () => {
  it('counts distinct pages, the last page and loops from the turns', () => {
    let reading = startReading(4);
    for (const step of [turn(0, 1), turn(1, 2), turn(2, 3), turn(3, 0), turn(0, 1)]) {
      reading = afterTurn(reading, step);
    }
    const properties = viewEndedProperties(questKey, reading, 64_600, 'back');
    expectNoProblems('quest_view_ended', properties);
    expect(properties).toEqual({
      quest_id: questKey,
      seconds: 65,
      pages_seen: 4,
      completed_flg: true,
      loops: 1,
      exit_type: 0,
    });
    expect(reading.page).toBe(1);
  });

  it('a reader who never turns has seen the cover and not finished', () => {
    expect(viewEndedProperties(questKey, startReading(4), 3_000, 'hidden')).toEqual({
      quest_id: questKey,
      seconds: 3,
      pages_seen: 1,
      completed_flg: false,
      loops: 0,
      exit_type: 2,
    });
  });

  it('knows the ways to "Make your own Quest", straight or through sign-in', () => {
    const origin = 'https://onquest.in';
    expect(isMakeYourOwnHref('/quests/new', origin)).toBe(true);
    expect(isMakeYourOwnHref('/login?next=%2Fquests%2Fnew&intent=make_your_own&ref=x', origin)).toBe(true);
    expect(isMakeYourOwnHref('/login?next=%2F&intent=like', origin)).toBe(false);
    expect(isMakeYourOwnHref('/@riya', origin)).toBe(false);
    expect(isMakeYourOwnHref('https://elsewhere.example/quests/new', origin)).toBe(false);
  });
});
