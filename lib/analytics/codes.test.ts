import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ARRANGE_MODE_CODE,
  BLOG_CLICK_LOC_CODE,
  BLOG_EDITOR_ACTION_CODE,
  BLOG_LIKE_SOURCE_CODE,
  CONTENT_TYPE_CODE,
  CREATE_OPTION_CODE,
  ENTRY_TYPE_CODE,
  FROM_SCREEN_CODE,
  FULLSCREEN_VIA_CODE,
  LANDING_PAGE_CODE,
  LEGAL_PAGE_CODE,
  LEGAL_SOURCE_CODE,
  PAGE_TURN_DIRECTION_CODE,
  PAGE_TURN_VIA_CODE,
  PLATFORM_CODE,
  QUEST_CLICK_LOC_CODE,
  QUEST_PHOTO_ACTION_CODE,
  QUEST_SOURCE_CODE,
  REFERRER_CODE,
  TEMPLATE_CODE,
  UNAVAILABLE_REASON_CODE,
  VIEW_EXIT_CODE,
  VISIBILITY_CODE,
} from './codes';
import { parseCsv, readEventRows } from './taxonomyFromCsv';

// Every code the app sends means what the sheet says it means (docs/analytics/v2/codes.csv).

const read = (name: string) =>
  readFileSync(join(process.cwd(), 'docs', 'analytics', 'v2', `${name}.csv`), 'utf8');
const [, ...codeRows] = parseCsv(read('codes'));

/** The sheet's meaning of `code` in `list`, or undefined if the sheet has no such code. */
function meaning(list: string, code: number): string | undefined {
  return codeRows.find(([name, value]) => name?.trim() === list && Number(value) === code)?.[2];
}

/** [code list, our mapping, a word of the sheet's meaning for each of our values] */
const CASES: [string, Record<string, number>, Record<string, string>][] = [
  ['content_type', CONTENT_TYPE_CODE, { quest: 'Quest', blog: 'Blog', profile: 'Profile', guide: 'Guide' }],
  ['visibility', VISIBILITY_CODE, { public: 'Public', unlisted: 'Unlisted', private: 'Private' }],
  ['referrer', REFERRER_CODE, { none: 'None', whatsapp: 'WhatsApp', instagram: 'Instagram', other: 'Other' }],
  [
    'like source',
    BLOG_LIKE_SOURCE_CODE,
    { blog_page: 'blog page', feed: 'Feed', after_sign_in: 'after sign-in' },
  ],
  ['blog click_loc', BLOG_CLICK_LOC_CODE, { create: 'Write a blog', write_your_own: 'Write your own' }],
  [
    'blog_editor_action',
    BLOG_EDITOR_ACTION_CODE,
    {
      add_photos: 'Add photos',
      remove_photo: 'Remove photo',
      add_place: 'Add a place',
      link_quest: 'Link a Quest',
      create_quest: 'Create a Quest',
      preview: 'Preview',
      close: 'Close',
      remove_quest: 'Remove linked Quest',
      reorder_photos: 'Reorder',
      remove_place: 'Remove place',
    },
  ],
  ['legal page / source', LEGAL_PAGE_CODE, { privacy: 'page: Privacy', terms: 'page: Terms' }],
  [
    'legal page / source',
    LEGAL_SOURCE_CODE,
    {
      sign_in: 'source: Sign-in',
      settings: 'source: Settings',
      footer: 'source: Page footer',
      direct: 'source: Direct',
    },
  ],
  // AN-03
  [
    'from_screen',
    FROM_SCREEN_CODE,
    {
      home: 'Home',
      explore: 'Explore',
      quests_tab: 'Quests tab',
      profile: 'Profile',
      quest_page: 'Quest page',
      blog_page: 'Blog page',
      settings: 'Settings',
      notifications: 'Notifications',
      create_flow: 'Create flow',
      other: 'Other',
      create_page: 'Create page',
      blog_composer: 'Blog composer',
      guide_page: 'Guide page',
      sign_in: 'Sign-in',
      welcome: 'Welcome screens',
      legal: 'Privacy / Terms',
    },
  ],
  [
    'landing_page',
    LANDING_PAGE_CODE,
    {
      home: 'Home',
      quest_page: 'Quest page',
      blog_page: 'Blog page',
      profile: 'Profile',
      explore: 'Explore',
      quests: 'Quests',
      create: 'Create',
    },
  ],
  ['entry_type', ENTRY_TYPE_CODE, { default: 'Default', shared_link: 'Shared link', email: 'Email', other: 'Other' }],
  // AN-05
  [
    'template',
    TEMPLATE_CODE,
    {
      coastal: 'id coastal',
      alpine: 'id alpine',
      roadtrip: 'Roadtrip',
      winter: 'Winter',
      monsoon: 'Monsoon',
      desert: 'Desert',
      beach: 'id beach',
      mountain: 'id mountain',
    },
  ],
  [
    'quest_viewed source',
    QUEST_SOURCE_CODE,
    {
      shared_link: 'Shared link',
      home_feed: 'Home feed',
      suggested: 'Suggested for you',
      explore_trending: 'Explore Trending Quests',
      search: 'Search',
      profile: 'Profile',
      blog_or_guide: "Blog 'View Quest' or guide",
      notification: 'Notification',
      quests_tab: 'Quests tab',
      example: "'See an example'",
      your_quests_home: 'Your Quests on Home',
    },
  ],
  ['unavailable reason', UNAVAILABLE_REASON_CODE, { private: 'Private', removed: 'Removed', not_found: 'Not found' }],
  // AN-06
  [
    'click_loc',
    QUEST_CLICK_LOC_CODE,
    {
      home_banner: "Home banner 'Create a Quest'",
      create_menu: "Create (+) → 'Start a Quest'",
      make_your_own: "'Make your own Quest' on someone's Quest",
      make_your_own_unavailable: 'on a private / removed Quest page',
      your_quests_tile: "'+ Create a Quest' tile in Your Quests on Home",
      quests_tab_card: "'Create a Quest' card on the Quests tab",
      empty_state: 'Empty-state button',
      welcome: 'Welcome screen',
      whats_a_quest: "What's a Quest? sheet",
      blog_link_quest: 'Blog composer → Link a Quest',
      feed_explore: 'Feed / Explore',
    },
  ],
];

/** The "N = Meaning / …" list in an events.csv property description, as code → meaning. */
function describedCodes(event: string, property: string): Map<number, string> {
  const row = readEventRows(read('events')).find(
    (candidate) => candidate.event === event && candidate.property === property,
  );
  const codes = new Map<number, string>();
  for (const item of (row?.description ?? '').split(' / ')) {
    const match = /^(\d+) = (.+)$/.exec(item.trim());
    if (match?.[1] && match[2]) codes.set(Number(match[1]), match[2]);
  }
  return codes;
}

/** [event, property, our mapping, the sheet's exact meaning for each of our values] */
const DESCRIBED: [string, string, Record<string, number>, Record<string, string>][] = [
  ['quest_page_turn', 'direction', PAGE_TURN_DIRECTION_CODE, { next: 'Next', previous: 'Previous' }],
  ['quest_page_turn', 'via', PAGE_TURN_VIA_CODE, { tap: 'Tap', swipe: 'Swipe', key: 'Arrow key' }],
  ['quest_fullscreen', 'via', FULLSCREEN_VIA_CODE, { button: 'Button', escape: 'Escape key' }],
  [
    'quest_photo_click',
    'action',
    QUEST_PHOTO_ACTION_CODE,
    { open: 'Photo opened', next: 'Next photo', previous: 'Previous photo', map: "'See it on the map'" },
  ],
  [
    'quest_view_ended',
    'exit_type',
    VIEW_EXIT_CODE,
    {
      back: 'Back button',
      in_app: 'Navigated in app',
      hidden: 'Tab hidden or closed',
      make_your_own: 'Make your own Quest',
    },
  ],
  // AN-06
  [
    'quest_arranged',
    'arrange_mode',
    ARRANGE_MODE_CODE,
    {
      page_per_day: 'One page per day',
      chapters: 'Chapters (trip > 5 days)',
      day_split_by_time: 'Single day split by time',
      pick_order: 'Pick order, no dates',
      mixed: 'Mixed dated + undated',
    },
  ],
];

describe('codes.ts', () => {
  it.each(CASES)('%s: every code means what the sheet says', (list, codes, words) => {
    expect(Object.keys(codes).sort()).toEqual(Object.keys(words).sort());
    for (const [name, code] of Object.entries(codes)) {
      expect({ name, meaning: meaning(list, code) }).toEqual({
        name,
        meaning: expect.stringContaining(words[name] ?? '?'),
      });
    }
  });

  it.each(DESCRIBED)('%s.%s follows the sheet’s description (it has no code list)', (event, property, codes, words) => {
    const sheet = describedCodes(event, property);
    expect(sheet.size).toBe(Object.keys(codes).length);
    for (const [name, code] of Object.entries(codes)) {
      expect({ name, meaning: sheet.get(code) }).toEqual({ name, meaning: words[name] });
    }
  });

  it('platform follows common.csv (it has no code list)', () => {
    const [, ...rows] = parseCsv(read('common'));
    const row = rows.find(([name]) => name === 'platform');
    expect(row?.[3]).toBe(`${PLATFORM_CODE.mobile} = Mobile web / ${PLATFORM_CODE.desktop} = Desktop web`);
  });

  it('create_option_click.option follows the sheet’s description (it has no code list)', () => {
    const row = readEventRows(read('events')).find(
      (candidate) => candidate.event === 'create_option_click' && candidate.property === 'option',
    );
    expect(row?.description).toBe(
      `${CREATE_OPTION_CODE.quest} = Start a Quest / ${CREATE_OPTION_CODE.blog} = Write a blog / ` +
        `${CREATE_OPTION_CODE.closed} = Closed (X) without choosing`,
    );
  });
});
