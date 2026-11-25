import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { blogDocument, blogFunctions, blogPhoto } from './blogHelpers';
import { ALEX, ALEX_PUBLIC_TRIP, createTestDatabase, STRANGER } from './testDatabase';
import { questDocument, tripFunctions } from './tripHelpers';

// Create, autosave and Post a blog under decision 0001 (blogs spec §3.1–3.3, §4.3): every save
// archives the row it replaces, a stale saved_at fails, and the limits hold in the database.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
let blogs: ReturnType<typeof blogFunctions>;
let trips: ReturnType<typeof tripFunctions>;

beforeAll(async () => {
  test = await createTestDatabase();
  blogs = blogFunctions(test);
  trips = tripFunctions(test.queryAs);
  await test.addUser(STRANGER);
  await test.queryAs(STRANGER, `select public.save_profile(null, '{"handle": "sam", "name": "Sam"}')`);
  await blogs.grant('alex');
  await blogs.grant('sam');
}, 30_000);

const count = async (sql: string, params: unknown[] = []) =>
  Number((await test.db.query<{ n: number }>(sql, params)).rows[0]!.n);

/** A saved draft (create, then one autosave) ready to post. */
async function draftBlog(user = ALEX, document: Record<string, unknown> = blogDocument()) {
  const key = randomUUID();
  await blogs.create(user, key, { body: '' });
  await blogs.saveDraft(user, key, (await blogs.tokens(user, key)).draft, document);
  return key;
}

describe('create_blog', () => {
  it('makes an empty draft blog and its working copy under one key', async () => {
    const key = randomUUID();
    const savedAt = await blogs.create(ALEX, key, blogDocument({ title: 'First words' }));
    const { blog, draft } = await blogs.rows(ALEX, key);
    expect(blog).toMatchObject({
      key,
      owner_key: ALEX,
      slug: null,
      status: 'draft',
      visibility: 'public',
      comments_on: true,
      title: null,
      body: '',
      photos: [],
      published_at: null,
      save_reason: 'create',
      saved_by: ALEX,
    });
    expect(blog!.saved_at_text).toBe(savedAt);
    expect(draft).toMatchObject({ key, title: 'First words', save_reason: 'create', saved_by: ALEX });
    expect(draft!.saved_at_text).toBe(savedAt);
  });

  it('starts at the visibility the writer chose in Settings', async () => {
    await test.queryAs(STRANGER, `select public.save_profile_settings($1, '{"defaultVisibility": "unlisted"}')`, [
      (await test.queryAs<{ t: string }>(STRANGER, 'select saved_at::text t from public.profiles'))[0]!.t,
    ]);
    const key = randomUUID();
    await blogs.create(STRANGER, key);
    expect((await blogs.rows(STRANGER, key)).blog).toMatchObject({ visibility: 'unlisted' });
  });

  it('refuses a key that was already used by a blog', async () => {
    const key = randomUUID();
    await blogs.create(ALEX, key);
    await expect(blogs.create(ALEX, key)).rejects.toThrow(/key already used/);
    await expect(blogs.create(STRANGER, key)).rejects.toThrow(/key already used/);
  });

  it("refuses a Quest's key, live or only archived (they share the storage folder)", async () => {
    await expect(blogs.create(ALEX, ALEX_PUBLIC_TRIP)).rejects.toThrow(/key already used/);
    const archivedOnly = randomUUID();
    await test.db.query(
      `insert into public.trips_archive select $1, t.owner_key, t.slug, t.template_id, t.visibility,
         t.status, t.title, t.short_title, t.start_date, t.end_date, t.cover_photo_key, t.seed, t.content,
         t.word_count, t.published_at, t.photos, t.places, t.comments_on, t.search_text,
         t.published_draft_saved_at, t.started_at, t.saved_at, t.saved_by, t.save_reason, now()
       from public.trips t where t.key = $2`,
      [archivedOnly, ALEX_PUBLIC_TRIP],
    );
    await expect(blogs.create(ALEX, archivedOnly)).rejects.toThrow(/key already used/);
  });

  it("makes create_trip refuse a blog's key, live or only archived", async () => {
    const live = randomUUID();
    await blogs.create(ALEX, live);
    await expect(trips.create(ALEX, live)).rejects.toThrow(/key already used/);
    const archivedOnly = randomUUID();
    await test.db.query(
      `insert into public.blogs_archive (key, owner_key, slug, status, visibility, title, body, photos,
         place, linked_trip_key, comments_on, search_text, word_count, published_at,
         published_draft_saved_at, started_at, saved_at, saved_by, save_reason, archived_at)
       values ($1, $2, null, 'draft', 'public', null, '', '[]', null, null, true, '', 0, null, null, null,
         now(), $2, 'create', now())`,
      [archivedOnly, ALEX],
    );
    await expect(trips.create(ALEX, archivedOnly)).rejects.toThrow(/key already used/);
    // An unused key still works, so the replaced create_trip behaves as before.
    expect(await trips.create(ALEX, randomUUID())).toMatch(/^\d{4}-/);
  });

  it('enforces the limits: 10 photos, a 100-character title, 10,000 characters of text', async () => {
    const photos = (n: number) => Array.from({ length: n }, blogPhoto);
    await expect(blogs.create(ALEX, randomUUID(), { photos: photos(11) })).rejects.toThrow(/too many photos/);
    await expect(blogs.create(ALEX, randomUUID(), { title: 'a'.repeat(101) })).rejects.toThrow(/too long/);
    await expect(blogs.create(ALEX, randomUUID(), { body: 'a'.repeat(10_001) })).rejects.toThrow(/too long/);
    // Counted in characters, not bytes: 100 Devanagari letters fit.
    await blogs.create(ALEX, randomUUID(), { title: 'ग'.repeat(100), photos: photos(10) });
  });

  it('refuses a broken document', async () => {
    await expect(blogs.create(ALEX, randomUUID(), { photos: [{ id: 'nope', width: 1, height: 1 }] })).rejects.toThrow(
      /invalid document/,
    );
    await expect(blogs.create(ALEX, randomUUID(), { place: { name: ' ' } })).rejects.toThrow(/invalid document/);
    await expect(blogs.create(ALEX, randomUUID(), { linkedQuestKey: 'x' })).rejects.toThrow(/invalid document/);
    await expect(blogs.create(ALEX, randomUUID(), '[]')).rejects.toThrow(/invalid document/);
  });
});

describe('save_blog_draft', () => {
  it('archives the old draft and inserts the new document, one archive row per save', async () => {
    const key = randomUUID();
    await blogs.create(ALEX, key, { body: 'a' });
    for (const body of ['ab', 'abc', 'abcd']) {
      await blogs.saveDraft(ALEX, key, (await blogs.tokens(ALEX, key)).draft, { body });
    }
    const { blog, draft } = await blogs.rows(ALEX, key);
    expect(draft).toMatchObject({ body: 'abcd', save_reason: 'save', saved_by: ALEX });
    expect(await count('select count(*) n from public.blog_drafts_archive where key = $1', [key])).toBe(3);
    // Draft saves never touch what readers see.
    expect(blog).toMatchObject({ save_reason: 'create', body: '' });
    expect(await count('select count(*) n from public.blogs_archive where key = $1', [key])).toBe(0);
  });

  it('fails with a conflict when another tab saved first', async () => {
    const key = randomUUID();
    await blogs.create(ALEX, key);
    const basedOn = (await blogs.tokens(ALEX, key)).draft;
    await blogs.saveDraft(ALEX, key, basedOn, { body: 'tab A' });
    await expect(blogs.saveDraft(ALEX, key, basedOn, { body: 'tab B' })).rejects.toThrow(/conflict/);
    expect((await blogs.rows(ALEX, key)).draft).toMatchObject({ body: 'tab A' });
  });

  it("can't touch someone else's draft", async () => {
    const key = await draftBlog();
    await expect(
      blogs.saveDraft(STRANGER, key, (await blogs.tokens(ALEX, key)).draft, { body: 'mine now' }),
    ).rejects.toThrow(/not found/);
  });

  it('enforces the limits on every save', async () => {
    const key = randomUUID();
    await blogs.create(ALEX, key);
    const basedOn = (await blogs.tokens(ALEX, key)).draft;
    await expect(
      blogs.saveDraft(ALEX, key, basedOn, { photos: Array.from({ length: 11 }, blogPhoto) }),
    ).rejects.toThrow(/too many photos/);
    await expect(blogs.saveDraft(ALEX, key, basedOn, { title: 'a'.repeat(101) })).rejects.toThrow(/too long/);
    await expect(blogs.saveDraft(ALEX, key, basedOn, { body: 'a'.repeat(10_001) })).rejects.toThrow(/too long/);
  });

  it('never stores coordinates or anything else the document schema lacks', async () => {
    const key = randomUUID();
    await blogs.create(ALEX, key);
    const photo = blogPhoto();
    await blogs.saveDraft(ALEX, key, (await blogs.tokens(ALEX, key)).draft, {
      body: 'x',
      photos: [{ ...photo, lat: 15.49, lng: 73.82, caption: 'secret' }],
      place: { name: ' Goa ', city: 'Panjim', countryCode: 'IN', lat: 15.49, lng: 73.82 },
    });
    const { draft } = await blogs.rows(ALEX, key);
    expect(draft!.photos).toEqual([photo]);
    expect(draft!.place).toEqual({ name: 'Goa', city: 'Panjim', countryCode: 'IN' });
  });
});

describe('publish_blog', () => {
  it('refuses a title with no text and no photo, and text with no title', async () => {
    const titleOnly = await draftBlog(ALEX, { title: 'Just a title', body: '  \n ' });
    await expect(blogs.publish(ALEX, titleOnly)).rejects.toThrow(/empty/);
    const noTitle = await draftBlog(ALEX, { title: '   ', body: 'Some text' });
    await expect(blogs.publish(ALEX, noTitle)).rejects.toThrow(/empty/);
    // A title and one photo is enough.
    const photoOnly = await draftBlog(ALEX, { title: 'Pictures', photos: [blogPhoto()] });
    expect((await blogs.publish(ALEX, photoOnly, { slug: 'pictures' })).slug).toBe('pictures');
  });

  it('needs a visibility on the first Post', async () => {
    const key = await draftBlog();
    await expect(blogs.publish(ALEX, key, { visibility: null })).rejects.toThrow(/invalid visibility/);
    await expect(blogs.publish(ALEX, key, { visibility: 'everyone' })).rejects.toThrow(/invalid visibility/);
  });

  it('copies the draft to the live row, archives the old row and leaves the draft as it was', async () => {
    const document = blogDocument({ title: '  Goa on 15k  ', place: { name: 'Goa', city: 'Panjim' } });
    const key = await draftBlog(ALEX, document);
    const before = await blogs.rows(ALEX, key);
    const draftArchive = await count('select count(*) n from public.blog_drafts_archive where key = $1', [key]);

    const result = await blogs.publish(ALEX, key, { slug: 'goa-on-15k' });
    expect(result).toMatchObject({ slug: 'goa-on-15k', first_publish: true });
    const after = await blogs.rows(ALEX, key);
    expect(after.blog).toMatchObject({
      status: 'published',
      visibility: 'public',
      slug: 'goa-on-15k',
      title: 'Goa on 15k',
      body: document.body,
      photos: document.photos,
      place: { name: 'Goa', city: 'Panjim' },
      comments_on: true,
      // 3 words of title + 13 of body
      word_count: 16,
      save_reason: 'publish',
    });
    expect(after.blog!.search_text).toBe(
      'goa on 15k goa panjim three days, one scooter and far too much bebinca.\n\nwe started in panjim.',
    );
    expect(after.blog!.saved_at_text).toBe(result.saved_at);
    expect(after.blog!.published_draft_saved_at).toEqual(before.draft!.saved_at);
    expect(after.draft!.saved_at_text).toBe(before.draft!.saved_at_text);
    expect(await count('select count(*) n from public.blogs_archive where key = $1', [key])).toBe(1);
    expect(await count('select count(*) n from public.blog_drafts_archive where key = $1', [key])).toBe(
      draftArchive,
    );
    expect((await blogs.getBlog('alex', 'goa-on-15k'))?.blog).toMatchObject({ key, title: 'Goa on 15k' });
  });

  it('saves and posts a body with formatting markers byte for byte (blogs-editor spec §4.1)', async () => {
    const body =
      '# Day 1\n## Morning\n- **Beach** and *fort*\n* ~~old~~ `new`\n1. [Goa](https://goa.example.in)\n\n> Slow down.\n>\n>!he was the guide!< 🌧️';
    const key = await draftBlog(ALEX, blogDocument({ body }));
    expect((await blogs.rows(ALEX, key)).draft).toMatchObject({ body });
    const { slug } = await blogs.publish(ALEX, key, { slug: 'formatted-day-1' });
    const after = await blogs.rows(ALEX, key);
    expect(after.blog).toMatchObject({ body });
    expect(after.draft).toMatchObject({ body });
    expect((await blogs.getBlog('alex', slug))?.blog.body).toBe(body);
  });

  it('counts markers toward the 10,000-character limit, as stored', async () => {
    const key = await draftBlog();
    const atLimit = `**${'a'.repeat(9_996)}**`;
    await blogs.saveDraft(ALEX, key, (await blogs.tokens(ALEX, key)).draft, { body: atLimit });
    expect((await blogs.rows(ALEX, key)).draft).toMatchObject({ body: atLimit });
    await expect(
      blogs.saveDraft(ALEX, key, (await blogs.tokens(ALEX, key)).draft, { body: `*${atLimit}*` }),
    ).rejects.toThrow(/too long/);
  });

  it('keeps the slug, visibility and published_at when an edit is posted', async () => {
    const key = await draftBlog();
    await blogs.publish(ALEX, key, { visibility: 'unlisted', slug: 'keeps-its-link-k3f9x2' });
    const first = await blogs.rows(ALEX, key);
    await blogs.saveDraft(ALEX, key, first.draft!.saved_at_text, blogDocument({ title: 'A new title' }));
    const again = await blogs.publish(ALEX, key, { visibility: null, slug: 'a-new-title' });
    expect(again).toMatchObject({ slug: 'keeps-its-link-k3f9x2', first_publish: false });
    const { blog } = await blogs.rows(ALEX, key);
    expect(blog).toMatchObject({ slug: 'keeps-its-link-k3f9x2', visibility: 'unlisted', title: 'A new title' });
    expect(blog!.published_at).toEqual(first.blog!.published_at);
  });

  it("doesn't show draft edits until the next Post", async () => {
    const key = await draftBlog();
    await blogs.publish(ALEX, key, { slug: 'edits-wait' });
    await blogs.saveDraft(ALEX, key, (await blogs.tokens(ALEX, key)).draft, { title: 'Half typed', body: 'wip' });
    expect((await blogs.getBlog('alex', 'edits-wait'))?.blog).toMatchObject({ title: 'Goa on 15k' });
  });

  it('fails with a conflict on a stale draft or a stale live row', async () => {
    const key = await draftBlog();
    const stale = await blogs.tokens(ALEX, key);
    await blogs.saveDraft(ALEX, key, stale.draft, blogDocument({ body: 'newer' }));
    await expect(blogs.publish(ALEX, key, { basedOn: stale })).rejects.toThrow(/conflict/);

    const other = await draftBlog();
    await blogs.publish(ALEX, other, { slug: 'stale-live' });
    const staleLive = await blogs.tokens(ALEX, other);
    await blogs.setComments(ALEX, other, staleLive.blog, false);
    await expect(blogs.publish(ALEX, other, { basedOn: staleLive, visibility: null })).rejects.toThrow(
      /conflict/,
    );
  });

  it('adds -2, -3 when the writer already has that slug', async () => {
    expect((await blogs.publish(ALEX, await draftBlog(), { slug: 'same-title' })).slug).toBe('same-title');
    expect((await blogs.publish(ALEX, await draftBlog(), { slug: 'same-title' })).slug).toBe('same-title-2');
    expect((await blogs.publish(ALEX, await draftBlog(), { slug: 'same-title' })).slug).toBe('same-title-3');
    // Someone else may use it under their own handle.
    expect((await blogs.publish(STRANGER, await draftBlog(STRANGER), { slug: 'same-title' })).slug).toBe(
      'same-title',
    );
  });

  it("never reuses a deleted blog's slug, even under a handle the writer has since left", async () => {
    const gone = await draftBlog(STRANGER);
    await blogs.publish(STRANGER, gone, { slug: 'old-story' });
    await blogs.remove(STRANGER, gone);
    const profile = (await test.queryAs<{ t: string }>(STRANGER, 'select saved_at::text t from public.profiles'))[0]!;
    await test.queryAs(STRANGER, `select public.save_profile($1, '{"handle": "sam_new", "name": "Sam"}')`, [
      profile.t,
    ]);
    expect((await blogs.publish(STRANGER, await draftBlog(STRANGER), { slug: 'old-story' })).slug).toBe(
      'old-story-2',
    );
  });

  it('refuses a malformed slug on the first Post', async () => {
    await expect(blogs.publish(ALEX, await draftBlog(), { slug: 'Not A Slug' })).rejects.toThrow(/invalid slug/);
    await expect(blogs.publish(ALEX, await draftBlog(), { slug: 'a'.repeat(78) })).rejects.toThrow(/invalid slug/);
  });

  it("keeps a linked Quest only if it's the writer's own published Quest", async () => {
    const own = await draftBlog(ALEX, blogDocument({ linkedQuestKey: ALEX_PUBLIC_TRIP }));
    await blogs.publish(ALEX, own, { slug: 'linked-own' });
    expect((await blogs.rows(ALEX, own)).blog).toMatchObject({ linked_trip_key: ALEX_PUBLIC_TRIP });

    const someoneElses = await draftBlog(STRANGER, blogDocument({ linkedQuestKey: ALEX_PUBLIC_TRIP }));
    await blogs.publish(STRANGER, someoneElses, { slug: 'linked-other' });
    expect((await blogs.rows(STRANGER, someoneElses)).blog).toMatchObject({ linked_trip_key: null });

    const draftQuest = randomUUID();
    await trips.create(ALEX, draftQuest);
    await trips.saveDraft(ALEX, draftQuest, (await trips.rows(ALEX, draftQuest)).draft!.saved_at_text, questDocument(3));
    const toDraft = await draftBlog(ALEX, blogDocument({ linkedQuestKey: draftQuest }));
    await blogs.publish(ALEX, toDraft, { slug: 'linked-draft' });
    expect((await blogs.rows(ALEX, toDraft)).blog).toMatchObject({ linked_trip_key: null });
    // The draft keeps what the writer chose.
    expect((await blogs.rows(ALEX, toDraft)).draft).toMatchObject({ linked_trip_key: draftQuest });
  });
});

describe('set_blog_visibility and set_blog_comments', () => {
  it("can't set the visibility of a draft (it's chosen on the first Post)", async () => {
    const key = await draftBlog();
    await expect(
      blogs.setVisibility(ALEX, key, (await blogs.tokens(ALEX, key)).blog, 'private'),
    ).rejects.toThrow(/not published/);
  });

  it('change one field, keep the URL, and archive the old row', async () => {
    const key = await draftBlog();
    await blogs.publish(ALEX, key, { slug: 'private-later' });
    const before = await blogs.rows(ALEX, key);
    await blogs.setVisibility(ALEX, key, before.blog!.saved_at_text, 'private');
    expect(await blogs.getBlog('alex', 'private-later')).toBeNull();
    const after = await blogs.rows(ALEX, key);
    expect(after.blog).toMatchObject({ visibility: 'private', slug: 'private-later', save_reason: 'visibility' });
    expect(after.blog!.published_at).toEqual(before.blog!.published_at);

    await blogs.setComments(ALEX, key, after.blog!.saved_at_text, false);
    const last = await blogs.rows(ALEX, key);
    expect(last.blog).toMatchObject({ comments_on: false, visibility: 'private', save_reason: 'comments' });
    await blogs.setVisibility(ALEX, key, last.blog!.saved_at_text, 'unlisted');
    expect((await blogs.getBlog('alex', 'private-later'))?.blog).toMatchObject({ comments_on: false });
    expect(await count('select count(*) n from public.blogs_archive where key = $1', [key])).toBe(4);
  });

  it('fail with a conflict on a stale saved_at, and for someone else', async () => {
    const key = await draftBlog();
    await blogs.publish(ALEX, key, { slug: 'stale-menu' });
    const stale = (await blogs.tokens(ALEX, key)).blog;
    await blogs.setComments(ALEX, key, stale, false);
    await expect(blogs.setVisibility(ALEX, key, stale, 'private')).rejects.toThrow(/conflict/);
    await expect(blogs.setComments(ALEX, key, stale, true)).rejects.toThrow(/conflict/);
    const current = (await blogs.tokens(ALEX, key)).blog;
    await expect(blogs.setVisibility(STRANGER, key, current, 'private')).rejects.toThrow(/not found/);
  });
});
