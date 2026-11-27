import { describe, expect, it } from 'vitest';
import { QuestCreateSourceSchema } from '@/lib/analytics/sources';
import { expectNoProblems, validateEvent } from '@/lib/analytics/validate';
import { QuestDocumentSchema, type QuestDocument } from '@/lib/trip/schema';
import {
  createQuestClickProperties,
  photoLimitProperties,
  photosSelectedProperties,
  questEditProperties,
  type PickedSummary,
} from './createFlowProperties';
import { movePhoto, removePhoto, setCaption } from './pageEdits';

// Each builder fills every required property of its v2 event from what the screen has, and never
// puts user text (title, captions, file names) in a property.

const KEY = '00000000-0000-4000-8000-0000000000c1';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Photos 3 to a page, as arrangePages lays them out; the first caption was written automatically. */
function questDocument(photoCount: number): QuestDocument {
  const ids = Array.from({ length: photoCount }, (_, i) => id(100 + i));
  const pages = Array.from({ length: Math.ceil(ids.length / 3) }, (_, i) => ids.slice(i * 3, i * 3 + 3));
  return QuestDocumentSchema.parse({
    templateId: 'coastal',
    title: 'Monsoon weekend in Panjim',
    content: { favourites: [], days: pages.map((photoIds, i) => ({ id: id(200 + i), placeIds: [], photoIds })) },
    photos: ids.map((photoId, i) => ({
      id: photoId,
      width: 1600,
      height: 1200,
      ...(i === 0 ? { caption: 'Sunset at Miramar', captionSource: 'auto' } : {}),
    })),
    places: [],
  });
}

describe('create_quest_click', () => {
  it('has a click_loc for every source, and fills every property it knows', () => {
    for (const source of QuestCreateSourceSchema.options) {
      expectNoProblems(
        'create_quest_click',
        createQuestClickProperties({ source, hasPublishedQuest: false, signedIn: true }),
      );
    }
    expect(
      createQuestClickProperties({ source: 'make_your_own', contentId: KEY, hasPublishedQuest: true, signedIn: false }),
    ).toEqual({ click_loc: 2, content_id: KEY, is_first_quest_flg: false, signed_in_flg: false });
    expect(createQuestClickProperties({ source: 'blog_link', hasPublishedQuest: false, signedIn: true })).toMatchObject({
      click_loc: 9,
      is_first_quest_flg: true,
    });
    expect(createQuestClickProperties({ source: 'unavailable_quest', signedIn: true }).click_loc).toBe(3);
  });

  it('leaves is_first_quest_flg out where the screen can’t know it; the event is still valid otherwise', () => {
    const properties = createQuestClickProperties({ source: 'create_menu', signedIn: true });
    expect(properties.is_first_quest_flg).toBeUndefined();
    const { properties: sent, problems } = validateEvent('create_quest_click', properties);
    expect(sent).toMatchObject({ click_loc: 1, signed_in_flg: true });
    expect(problems.join(' ')).toContain('is_first_quest_flg');
  });
});

describe('photos_selected', () => {
  const photo = (overrides: Partial<PickedSummary>): PickedSummary => ({
    fileName: 'IMG_0001.jpg',
    failed: false,
    read: true,
    hasDate: false,
    hasLocation: false,
    ...overrides,
  });

  it('counts dates, locations, HEIC and failures without file names', () => {
    const properties = photosSelectedProperties(
      KEY,
      [
        photo({ hasDate: true, hasLocation: true }),
        photo({ hasDate: true }),
        photo({ fileName: 'Goa beach.HEIC' }),
        photo({ fileName: 'IMG_0004.heif', failed: true }),
      ],
      42_400,
    );
    expect(properties).toEqual({
      quest_id: KEY,
      photo_count: 3,
      with_date_count: 2,
      with_location_count: 1,
      no_metadata_count: 1,
      heic_count: 2,
      failed_count: 1,
      pick_time_sec: 42,
    });
    expectNoProblems('photos_selected', properties);
    expect(JSON.stringify(properties)).not.toMatch(/IMG|Goa|HEIC/);
  });
});

describe('photo_limit_hit', () => {
  it('has no key on Pick photos and the draft key on Review', () => {
    expect(photoLimitProperties('max', 'pick')).toEqual({ quest_id: undefined, limit: 0, screen: 0 });
    expectNoProblems('photo_limit_hit', photoLimitProperties('max', 'pick'));
    expectNoProblems('photo_limit_hit', photoLimitProperties('min', 'review', KEY));
    expect(photoLimitProperties('min', 'review', KEY)).toEqual({ quest_id: KEY, limit: 1, screen: 1 });
  });
});

describe('quest_edit', () => {
  const document = questDocument(6);
  const firstPhoto = document.photos[0]?.id ?? '';
  const lastPhoto = document.photos[5]?.id ?? '';

  it('a caption edit says whether the caption had been written automatically, never the text', () => {
    const after = setCaption(document, firstPhoto, 'My own words');
    const properties = questEditProperties({
      questKey: KEY,
      action: 'caption',
      before: document,
      after,
      photoId: firstPhoto,
      isPublished: false,
    });
    expect(properties).toEqual({
      quest_id: KEY,
      action: 1,
      page_no: 1,
      blocked_flg: false,
      caption_was_auto_flg: true,
      is_published_flg: false,
      photo_count_after: 6,
    });
    expectNoProblems('quest_edit', properties);
    expect(JSON.stringify(properties)).not.toMatch(/Miramar|own words|Panjim/);
  });

  it('a move reports the page it went to', () => {
    const five = questDocument(5); // pages of 3 and 2
    const photoId = five.photos[0]?.id ?? '';
    const result = movePhoto(five, photoId, 1);
    expect(result.ok).toBe(true);
    const properties = questEditProperties({
      questKey: KEY,
      action: 'move_photo',
      before: five,
      after: result.ok ? result.document : undefined,
      photoId,
      pageIndex: 1,
      isPublished: true,
    });
    expect(properties).toMatchObject({ action: 4, page_no: 2, blocked_flg: false, is_published_flg: true });
    expectNoProblems('quest_edit', properties);
  });

  it('a move to a full page is refused and still sent', () => {
    const result = movePhoto(document, lastPhoto, 0);
    expect(result.ok).toBe(false);
    const properties = questEditProperties({
      questKey: KEY,
      action: 'move_photo',
      before: document,
      photoId: lastPhoto,
      pageIndex: 0,
      isPublished: false,
    });
    expect(properties).toMatchObject({ page_no: 1, blocked_flg: true, photo_count_after: 6 });
    expectNoProblems('quest_edit', properties);
  });

  it('a remove refused below 3 photos is blocked, on the photo’s page, with the count unchanged', () => {
    const small = questDocument(3);
    const photoId = small.photos[2]?.id ?? '';
    expect(removePhoto(small, photoId).ok).toBe(false);
    const properties = questEditProperties({
      questKey: KEY,
      action: 'remove_photo',
      before: small,
      photoId,
      isPublished: false,
    });
    expect(properties).toMatchObject({ action: 7, page_no: 1, blocked_flg: true, photo_count_after: 3 });
    expectNoProblems('quest_edit', properties);
  });

  it('title and undo have no page', () => {
    for (const action of ['title', 'undo'] as const) {
      const properties = questEditProperties({ questKey: KEY, action, before: document, after: document, isPublished: false });
      expect(properties.page_no).toBeUndefined();
      expectNoProblems('quest_edit', properties);
    }
  });
});
