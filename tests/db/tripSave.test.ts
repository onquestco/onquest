import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ALEX, createTestDatabase, NEWCOMER, STRANGER } from './testDatabase';
import { questDocument, tripFunctions } from './tripHelpers';

// Create, autosave and publish under decision 0001 (spec A §3.10): every save archives the live
// row and inserts the new one, carries over what it must, and fails on a stale saved_at.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
let trips: ReturnType<typeof tripFunctions>;

beforeAll(async () => {
  test = await createTestDatabase();
  trips = tripFunctions(test.queryAs);
  await test.addUser(STRANGER);
  await test.addUser(NEWCOMER);
  await test.queryAs(STRANGER, `select public.save_profile(null, '{"handle": "sam", "name": "Sam"}')`);
}, 30_000);

const count = async (sql: string, params: unknown[] = []) =>
  Number((await test.db.query<{ n: number }>(sql, params)).rows[0]!.n);
const getTrip = async (handle: string, slug: string) =>
  (
    await test.queryAs<{ r: { trip: Record<string, unknown>; photos: unknown[] } | null }>(
      undefined,
      'select public.get_trip($1, $2) r',
      [handle, slug],
    )
  )[0]!.r;

/** A draft Quest with `photos` photos saved, ready to publish. */
async function draftQuest(user = ALEX, photos = 3, extra: Record<string, unknown> = {}) {
  const key = randomUUID();
  await trips.create(user, key);
  const { draft } = await trips.rows(user, key);
  await trips.saveDraft(user, key, draft!.saved_at_text, questDocument(photos, extra));
  return key;
}
const tokens = async (user: string, key: string) => {
  const { trip, draft } = await trips.rows(user, key);
  return { trip: trip!.saved_at_text, draft: draft!.saved_at_text };
};

describe('create_trip', () => {
  it('makes a draft trip and its working copy under one key', async () => {
    const key = randomUUID();
    const savedAt = await trips.create(ALEX, key);
    const { trip, draft } = await trips.rows(ALEX, key);
    expect(trip).toMatchObject({
      key,
      status: 'draft',
      visibility: 'public',
      comments_on: true,
      save_reason: 'create',
    });
    expect(trip?.slug).toMatch(/^trip-[a-z0-9]{6}$/);
    expect(trip?.saved_at_text).toBe(savedAt);
    expect(draft).toMatchObject({ key, template_id: 'beach', photos: [], save_reason: 'create' });
  });

  it('refuses a key that was already used', async () => {
    const key = randomUUID();
    await trips.create(ALEX, key);
    await expect(trips.create(ALEX, key)).rejects.toThrow(/key already used/);
  });

  it('needs a profile first', async () => {
    await expect(trips.create(NEWCOMER, randomUUID())).rejects.toThrow(/no profile/);
  });

  it('is never visible through get_trip', async () => {
    const key = randomUUID();
    await trips.create(ALEX, key);
    const { trip } = await trips.rows(ALEX, key);
    expect(await getTrip('alex', trip!.slug as string)).toBeNull();
  });
});

describe('save_trip_draft', () => {
  it('archives the old draft and inserts the new document', async () => {
    const key = await draftQuest();
    const { draft } = await trips.rows(ALEX, key);
    expect((draft?.photos as unknown[]).length).toBe(3);
    expect(draft).toMatchObject({ title: 'Three days in Goa', save_reason: 'save', saved_by: ALEX });
    expect(await count('select count(*) n from public.trip_drafts_archive where key = $1', [key])).toBe(1);
  });

  it('fails with a conflict on a stale saved_at, as when two devices save the same version', async () => {
    const key = randomUUID();
    await trips.create(ALEX, key);
    const basedOn = (await tokens(ALEX, key)).draft;
    await trips.saveDraft(ALEX, key, basedOn, questDocument(3));
    await expect(trips.saveDraft(ALEX, key, basedOn, questDocument(4))).rejects.toThrow(/conflict/);
  });

  it('refuses more than 15 photos', async () => {
    const key = randomUUID();
    await trips.create(ALEX, key);
    await expect(
      trips.saveDraft(ALEX, key, (await tokens(ALEX, key)).draft, questDocument(16)),
    ).rejects.toThrow(/too many photos/);
  });

  it("can't touch someone else's draft", async () => {
    const key = await draftQuest();
    await expect(
      trips.saveDraft(STRANGER, key, (await tokens(ALEX, key)).draft, questDocument(3)),
    ).rejects.toThrow(/not found/);
  });
});

describe('publish_trip', () => {
  it('needs at least 3 photos', async () => {
    const key = await draftQuest(ALEX, 2);
    await expect(trips.publish(ALEX, key, await tokens(ALEX, key))).rejects.toThrow(/too few photos/);
  });

  it('copies the draft to the public row, archives the old row and deletes nothing else', async () => {
    const key = await draftQuest();
    const before = await trips.rows(ALEX, key);
    const counts = async () => [
      await count('select count(*) n from public.trip_drafts'),
      await count('select count(*) n from public.photos'),
      await count('select count(*) n from public.places'),
    ];
    const countsBefore = await counts();
    const result = await trips.publish(ALEX, key, await tokens(ALEX, key), {
      slug: 'goa-weekend',
      words: 90,
    });
    expect(result).toMatchObject({ slug: 'goa-weekend', first_publish: true });
    const after = await trips.rows(ALEX, key);
    expect(after.trip).toMatchObject({
      status: 'published',
      slug: 'goa-weekend',
      seed: before.trip?.seed,
      comments_on: true,
      word_count: 90,
      save_reason: 'publish',
      photos: before.draft?.photos,
    });
    expect(after.trip?.saved_at_text).toBe(result.saved_at);
    expect(await counts()).toEqual(countsBefore);
    expect(await count('select count(*) n from public.trips_archive where key = $1', [key])).toBe(1);
    const page = await getTrip('alex', 'goa-weekend');
    expect(page?.photos).toHaveLength(3);
    expect(page?.trip.comments_on).toBe(true);
  });

  it('publishes with a cover photo that only exists in the document', async () => {
    const key = randomUUID();
    await trips.create(ALEX, key);
    const document = questDocument(3);
    await trips.saveDraft(ALEX, key, (await tokens(ALEX, key)).draft, {
      ...document,
      coverPhotoId: document.photos[1]!.id,
    });
    await trips.publish(ALEX, key, await tokens(ALEX, key), { slug: 'cover-check' });
    expect((await getTrip('alex', 'cover-check'))?.trip.cover_photo_id).toBe(document.photos[1]!.id);
  });

  it('keeps the slug, seed, published_at and comments setting on a re-publish', async () => {
    const key = await draftQuest();
    await trips.publish(ALEX, key, await tokens(ALEX, key), { slug: 'keeps-its-link' });
    const first = await trips.rows(ALEX, key);
    await trips.setComments(ALEX, key, first.trip!.saved_at_text, false);
    await trips.saveDraft(ALEX, key, first.draft!.saved_at_text, questDocument(4, { title: 'Four days' }));
    const again = await trips.publish(ALEX, key, await tokens(ALEX, key), {
      slug: 'a-new-title',
      title: 'Four days',
    });
    expect(again).toMatchObject({ slug: 'keeps-its-link', first_publish: false });
    const { trip } = await trips.rows(ALEX, key);
    expect(trip).toMatchObject({
      slug: 'keeps-its-link',
      seed: first.trip?.seed,
      comments_on: false,
      title: 'Four days',
    });
    expect(trip?.published_at).toEqual(first.trip?.published_at);
  });

  it('fails when the public row changed since the tab loaded it', async () => {
    const key = await draftQuest();
    await trips.publish(ALEX, key, await tokens(ALEX, key), { slug: 'stale-tab' });
    const stale = await tokens(ALEX, key);
    await trips.setVisibility(ALEX, key, stale.trip, 'private');
    await expect(trips.publish(ALEX, key, stale, { visibility: 'public' })).rejects.toThrow(/conflict/);
  });

  it('adds -2 when the owner already has that slug', async () => {
    const first = await draftQuest();
    await trips.publish(ALEX, first, await tokens(ALEX, first), { slug: 'same-name' });
    const second = await draftQuest();
    expect((await trips.publish(ALEX, second, await tokens(ALEX, second), { slug: 'same-name' })).slug).toBe(
      'same-name-2',
    );
  });

  it("never reuses a deleted Quest's slug", async () => {
    const gone = await draftQuest();
    await trips.publish(ALEX, gone, await tokens(ALEX, gone), { slug: 'old-trip' });
    await trips.remove(ALEX, gone);
    const next = await draftQuest();
    expect((await trips.publish(ALEX, next, await tokens(ALEX, next), { slug: 'old-trip' })).slug).toBe(
      'old-trip-2',
    );
  });

  it('lets another person use the same slug under their own handle', async () => {
    const key = await draftQuest(STRANGER);
    expect(
      (await trips.publish(STRANGER, key, await tokens(STRANGER, key), { slug: 'goa-weekend' })).slug,
    ).toBe('goa-weekend');
  });

  it("doesn't show draft edits until the next publish", async () => {
    const key = await draftQuest();
    await trips.publish(ALEX, key, await tokens(ALEX, key), { slug: 'edits-wait' });
    await trips.saveDraft(ALEX, key, (await tokens(ALEX, key)).draft, questDocument(5));
    expect((await getTrip('alex', 'edits-wait'))?.photos).toHaveLength(3);
  });
});

describe('set_trip_visibility and set_trip_comments', () => {
  it('change one field, keep the URL and seed, and archive the old row', async () => {
    const key = await draftQuest();
    await trips.publish(ALEX, key, await tokens(ALEX, key), { slug: 'private-later' });
    const before = await trips.rows(ALEX, key);
    await trips.setVisibility(ALEX, key, before.trip!.saved_at_text, 'private');
    expect(await getTrip('alex', 'private-later')).toBeNull();
    const after = await trips.rows(ALEX, key);
    expect(after.trip).toMatchObject({
      visibility: 'private',
      slug: 'private-later',
      seed: before.trip?.seed,
    });
    expect(after.trip?.published_at).toEqual(before.trip?.published_at);
    await trips.setVisibility(ALEX, key, after.trip!.saved_at_text, 'unlisted');
    expect((await getTrip('alex', 'private-later'))?.trip.slug).toBe('private-later');
    expect(await count('select count(*) n from public.trips_archive where key = $1', [key])).toBe(3);
  });

  it('fail with a conflict on a stale saved_at', async () => {
    const key = await draftQuest();
    const stale = (await tokens(ALEX, key)).trip;
    await trips.setComments(ALEX, key, stale, false);
    await expect(trips.setVisibility(ALEX, key, stale, 'private')).rejects.toThrow(/conflict/);
  });
});
