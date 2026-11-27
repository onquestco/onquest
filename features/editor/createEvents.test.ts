import { describe, expect, it } from 'vitest';
import { QuestCreateSourceSchema } from '@/lib/analytics/sources';
import { expectNoProblems, validateEvent } from '@/lib/analytics/validate';
import { QuestDocumentSchema, type QuestDocument } from '@/lib/trip/schema';
import {
  arrangedProperties,
  arrangeMode,
  clickLocForSource,
  creationCompleteProperties,
  draftCreatedProperties,
  questUpdatedProperties,
  type FirstPublishFacts,
} from './createEvents';

// Each builder fills every required property of its v2 event (analytics v2 §4.2) from what the
// action has, and never puts user text (title, captions, place names) in a property.

const KEY = '00000000-0000-4000-8000-0000000000c1';
const NOW = new Date('2026-11-27T10:30:00Z');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

type PhotoSpec = { date?: string; caption?: string; captionSource?: 'auto' | 'user' };

/** A stored-shape document: photos 3 to a page, as arrangePages lays them out. */
function questDocument(photos: PhotoSpec[], extra: Partial<QuestDocument> = {}): QuestDocument {
  const ids = photos.map((_, i) => id(100 + i));
  const pages = Array.from({ length: Math.ceil(ids.length / 3) }, (_, i) => ids.slice(i * 3, i * 3 + 3));
  return QuestDocumentSchema.parse({
    templateId: 'coastal',
    title: 'Monsoon weekend in Panjim',
    content: {
      favourites: [],
      days: pages.map((photoIds, i) => ({ id: id(200 + i), placeIds: [], photoIds })),
    },
    photos: photos.map((spec, i) => ({ id: ids[i], width: 1600, height: 1200, ...spec })),
    places: [],
    ...extra,
  });
}

const days = (...counts: [string, number][]) =>
  counts.flatMap(([date, count]) => Array.from({ length: count }, () => ({ date })));

describe('quest_draft_created', () => {
  it('maps every /quests/new ?source= to a click_loc in the sheet', () => {
    expect(QuestCreateSourceSchema.options.map((source) => [source, clickLocForSource(source)])).toEqual([
      ['home_banner', 0],
      ['home_empty', 4],
      ['create_menu', 1],
      ['quests_tab', 5],
      ['quests_empty', 6],
      ['make_your_own', 2],
      ['ftue', 7],
      ['whatis_sheet', 8],
      ['blog_link', 9],
      ['unavailable_quest', 3],
    ]);
    for (const source of QuestCreateSourceSchema.options) {
      expectNoProblems('quest_draft_created', draftCreatedProperties(KEY, source));
    }
    expect(draftCreatedProperties(KEY, 'create_menu')).toEqual({ quest_id: KEY, click_loc: 1 });
  });
});

describe('arrangeMode', () => {
  it('reads arrangePages’ rule back from the photos’ trip days', () => {
    expect(arrangeMode(questDocument(days(['2026-07-01', 3], ['2026-07-02', 3])), false)).toBe(0);
    expect(arrangeMode(questDocument(days(['2026-07-01', 2])), false)).toBe(0);
    // Six days of 2 photos would need 6 pages: chunked into chapters instead.
    const sixDays = days(...[1, 2, 3, 4, 5, 6].map((day): [string, number] => [`2026-07-0${day}`, 2]));
    expect(arrangeMode(questDocument(sixDays), false)).toBe(1);
    expect(arrangeMode(questDocument(days(['2026-07-01', 7])), false)).toBe(2);
    expect(arrangeMode(questDocument([{}, {}, {}]), false)).toBe(3);
    expect(arrangeMode(questDocument([...days(['2026-07-01', 2]), {}]), false)).toBe(4);
  });

  it('is pick order when arranging failed, whatever the dates', () => {
    expect(arrangeMode(questDocument(days(['2026-07-01', 3], ['2026-07-02', 3])), true)).toBe(3);
  });
});

describe('quest_arranged', () => {
  const report = { pages: 2, photos: 6, captionsWritten: 4, failed: false, durationMs: 18_250 };
  const place = (n: number, name: string) => ({ id: id(300 + n), name, lat: 15.49, lng: 73.82 });

  it('takes the counts from the report and the mode and distinct places from the draft', () => {
    const document = questDocument(days(['2026-07-01', 3], ['2026-07-02', 3]), {
      places: [place(1, 'Panjim'), place(2, 'Panjim'), place(3, 'Anjuna')],
    });
    const properties = arrangedProperties(KEY, report, document);
    expect(properties).toEqual({
      quest_id: KEY,
      photo_count: 6,
      page_count: 2,
      arrange_mode: 0,
      place_count: 2,
      captions_auto_count: 4,
      failed_flg: false,
      duration_ms: 18_250,
    });
    expectNoProblems('quest_arranged', properties);
    expect(JSON.stringify(properties)).not.toContain('Panjim');
  });

  it('a failed arrange is still reported', () => {
    const failed = { ...report, failed: true, captionsWritten: 0 };
    const properties = arrangedProperties(KEY, failed, questDocument([{}, {}, {}]));
    expect(properties).toMatchObject({ arrange_mode: 3, failed_flg: true, place_count: 0 });
    expectNoProblems('quest_arranged', properties);
  });
});

describe('quest_creation_complete', () => {
  const facts: FirstPublishFacts = {
    title: 'Monsoon weekend in Panjim',
    visibility: 'unlisted',
    defaultVisibility: 'public',
    hasOtherPublishedQuest: false,
    signedUpAt: '2026-11-20T08:00:00Z',
    analytics: { clickLoc: 4, editCount: 3 },
    now: NOW,
  };
  const document = questDocument(
    [
      { date: '2026-07-01', caption: 'Rain on the Mandovi', captionSource: 'auto' },
      { date: '2026-07-01', caption: 'Fish thali', captionSource: 'user' },
      { date: '2026-07-01', caption: 'Old caption' }, // no captionSource: an old row, the traveller's own
      { date: '2026-07-02', captionSource: 'auto' }, // no caption: not counted
    ],
    { templateId: 'alpine', startedAt: '2026-11-27T10:17:30Z' },
  );

  it('carries lengths, counts and codes, never the title or captions', () => {
    const properties = creationCompleteProperties(KEY, document, facts);
    expect(properties).toEqual({
      quest_id: KEY,
      title_length: 25,
      visibility: 1,
      default_visibility: 0,
      template: 1,
      photo_count: 4,
      page_count: 2,
      edit_count: 3,
      captions_auto_kept: 1,
      captions_user_written: 2,
      minutes_since_start: 12.5,
      click_loc: 4,
      is_first_quest_flg: true,
      days_since_signup: 7,
    });
    expectNoProblems('quest_creation_complete', properties);
    const sent = JSON.stringify(properties);
    for (const text of ['Monsoon', 'Mandovi', 'thali', 'Old caption']) expect(sent).not.toContain(text);
  });

  it('counts the title in characters, not UTF-16 units', () => {
    expect(creationCompleteProperties(KEY, document, { ...facts, title: 'Goa 🌴🌴' }).title_length).toBe(6);
  });

  it('an old bundle (no analytics) and an old draft (no startedAt) still send, without those values', () => {
    const old = questDocument(days(['2026-07-01', 3]));
    const properties = creationCompleteProperties(KEY, old, {
      ...facts,
      analytics: undefined,
      defaultVisibility: undefined,
      hasOtherPublishedQuest: undefined,
    });
    const leftOut = ['edit_count', 'click_loc', 'minutes_since_start', 'default_visibility', 'is_first_quest_flg'];
    for (const name of leftOut) {
      expect(properties).not.toHaveProperty(name, expect.anything());
    }
    const { properties: kept, problems } = validateEvent('quest_creation_complete', properties);
    expect(kept).toMatchObject({ quest_id: KEY, photo_count: 3, page_count: 1, template: 0 });
    expect(problems.every((problem) => problem.endsWith(': missing'))).toBe(true);
  });

  it('is_first_quest_flg is false when the owner already has a published Quest', () => {
    const properties = creationCompleteProperties(KEY, document, { ...facts, hasOtherPublishedQuest: true });
    expect(properties.is_first_quest_flg).toBe(false);
  });
});

describe('quest_updated', () => {
  const document = questDocument(days(['2026-07-01', 3]), { templateId: 'coastal' });
  const facts = {
    visibility: 'public' as const,
    previousTemplateId: 'alpine',
    firstPublishedAt: '2026-11-17T09:00:00Z',
    analytics: { changeTypes: [4, 1] },
    now: NOW,
  };

  it('sends the change codes in order, whether the template changed, and the days since first publish', () => {
    const properties = questUpdatedProperties(KEY, document, facts);
    expect(properties).toEqual({
      quest_id: KEY,
      change_types: '1,4',
      template_changed_flg: true,
      visibility: 0,
      days_since_publish: 10,
    });
    expectNoProblems('quest_updated', properties);
    const sameTemplate = questUpdatedProperties(KEY, document, { ...facts, previousTemplateId: 'coastal' });
    expect(sameTemplate.template_changed_flg).toBe(false);
  });

  it('an old bundle (no analytics) still sends, without change_types', () => {
    const properties = questUpdatedProperties(KEY, document, { ...facts, analytics: undefined });
    expect(properties).not.toHaveProperty('change_types', expect.anything());
    expect(validateEvent('quest_updated', properties).problems).toEqual(['change_types: missing']);
  });
});
