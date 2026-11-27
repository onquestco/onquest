import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BLOG_CLICK_LOC_CODE,
  BLOG_EDITOR_ACTION_CODE,
  BLOG_LIKE_SOURCE_CODE,
  CONTENT_TYPE_CODE,
  CREATE_OPTION_CODE,
  LEGAL_PAGE_CODE,
  LEGAL_SOURCE_CODE,
  REFERRER_CODE,
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
