import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { blogDocument, blogFunctions } from './blogHelpers';
import { ALEX, createTestDatabase, STRANGER } from './testDatabase';
import { questDocument, tripFunctions } from './tripHelpers';

// Who sees what of a blog (blogs spec §3.3, §4.3, §7): tables only through RLS for the owner,
// readers only through get_blog, get_blog_status and get_blog_quest, with explicit field lists.
// The seed gives Alex a public (GOA), an unlisted (GOKARNA) and a private (SECRET) Quest.

const GOA = '00000000-0000-4000-8000-0000000000a1';
const GOKARNA = '00000000-0000-4000-8000-0000000000a2';
const SECRET = '00000000-0000-4000-8000-0000000000a3';
const BLOG_TABLES = [
  'blogs',
  'blog_drafts',
  'blogs_archive',
  'blog_drafts_archive',
  'removed_blog_urls',
  'feature_access',
  'feature_access_archive',
];

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
let blogs: ReturnType<typeof blogFunctions>;
let publicBlog: string;
let draftKey: string;
let privateKey: string;

beforeAll(async () => {
  test = await createTestDatabase();
  blogs = blogFunctions(test);
  await test.addUser(STRANGER);
  await test.queryAs(STRANGER, `select public.save_profile(null, '{"handle": "sam", "name": "Sam"}')`);
  await blogs.grant('alex');
  publicBlog = (await blogs.posted(ALEX, { slug: 'goa-on-15k', document: blogDocument({ place: { name: 'Goa' } }) }))
    .key;
  await blogs.posted(ALEX, { visibility: 'unlisted', slug: 'quiet-k3f9x2' });
  privateKey = (await blogs.posted(ALEX, { visibility: 'private', slug: 'just-me' })).key;
  draftKey = randomUUID();
  await blogs.create(ALEX, draftKey, blogDocument({ title: 'Not posted yet' }));
}, 30_000);

describe('blog tables', () => {
  it.each(BLOG_TABLES)('signed-out visitors cannot read %s', async (table) => {
    await expect(test.queryAs(undefined, `select * from public.${table}`)).rejects.toThrow(/permission denied/);
  });

  it("show a stranger none of Alex's rows", async () => {
    for (const table of ['blogs', 'blog_drafts', 'blogs_archive', 'blog_drafts_archive']) {
      expect(await test.queryAs(STRANGER, `select * from public.${table}`)).toEqual([]);
    }
    for (const table of ['removed_blog_urls', 'feature_access', 'feature_access_archive']) {
      await expect(test.queryAs(STRANGER, `select * from public.${table}`)).rejects.toThrow(/permission denied/);
    }
  });

  it('let the owner read their own private blog and draft', async () => {
    expect(await test.queryAs(ALEX, 'select visibility from public.blogs where key = $1', [privateKey])).toEqual([
      { visibility: 'private' },
    ]);
    expect(await test.queryAs(ALEX, 'select title from public.blog_drafts where key = $1', [draftKey])).toEqual([
      { title: 'Not posted yet' },
    ]);
  });
});

describe('get_blog', () => {
  it('returns a public blog, signed out, with only the listed fields', async () => {
    const page = await blogs.getBlog('ALEX', 'goa-on-15k');
    expect(Object.keys(page!).sort()).toEqual(['blog', 'owner', 'photo_folder']);
    expect(Object.keys(page!.blog).sort()).toEqual(
      [
        'body',
        'comments_on',
        'key',
        'photos',
        'place',
        'published_at',
        'saved_at',
        'slug',
        'title',
        'visibility',
        'word_count',
      ].sort(),
    );
    expect(Object.keys(page!.owner).sort()).toEqual(['avatar_url', 'handle', 'key', 'name']);
    expect(page).toMatchObject({
      blog: { key: publicBlog, slug: 'goa-on-15k', visibility: 'public', place: { name: 'Goa' } },
      owner: { key: ALEX, handle: 'alex', name: 'Alex Morgan' },
      photo_folder: `${ALEX}/${publicBlog}`,
    });
    const text = JSON.stringify(page);
    for (const hidden of ['linked_trip_key', 'search_text', 'started_at', 'published_draft_saved_at', 'saved_by']) {
      expect(text).not.toContain(hidden);
    }
  });

  it('returns unlisted blogs to anyone with the link', async () => {
    expect((await blogs.getBlog('alex', 'quiet-k3f9x2'))?.blog).toMatchObject({ visibility: 'unlisted' });
  });

  it('returns nothing for private blogs, drafts and unknown links, even to the owner', async () => {
    expect(await blogs.getBlog('alex', 'just-me')).toBeNull();
    expect(await blogs.getBlog('alex', 'just-me', ALEX)).toBeNull();
    expect(await blogs.getBlog('alex', 'nothing-here')).toBeNull();
    // Blog URLs and Quest URLs never mix.
    expect(await blogs.getBlog('alex', 'goa-2026')).toBeNull();
  });
});

describe('get_blog_status', () => {
  it('says private for a private blog, and nothing for anything else', async () => {
    expect(await blogs.status('alex', 'just-me')).toBe('private');
    expect(await blogs.status('alex', 'goa-on-15k')).toBeNull();
    expect(await blogs.status('alex', 'nothing-here')).toBeNull();
    // A private Quest's slug isn't a blog.
    expect(await blogs.status('alex', 'secret-trip')).toBeNull();
  });
});

describe('get_blog_quest (spec D12: a blog never makes a Quest more visible)', () => {
  const linkedBlog = async (visibility: string, questKey: string) =>
    (
      await blogs.posted(ALEX, {
        visibility,
        slug: `linked-${randomUUID().slice(0, 8)}`,
        document: blogDocument({ linkedQuestKey: questKey }),
      })
    ).key;

  it.each([
    ['public', GOA, true],
    ['public', GOKARNA, false],
    ['public', SECRET, false],
    ['unlisted', GOA, true],
    ['unlisted', GOKARNA, true],
    ['unlisted', SECRET, false],
    ['private', GOA, false],
  ])('a %s blog linking Quest %s shows the card: %s', async (visibility, questKey, shown) => {
    const card = await blogs.linkedQuest(await linkedBlog(visibility as string, questKey as string));
    if (shown) expect(card).toMatchObject({ key: questKey, status: 'published' });
    else expect(card).toBeNull();
  });

  it('shows nothing for a blog without a Quest, or one not posted yet', async () => {
    expect(await blogs.linkedQuest(publicBlog)).toBeNull();
    expect(await blogs.linkedQuest(draftKey)).toBeNull();
  });

  it('stops showing a Quest once it is deleted', async () => {
    const trips = tripFunctions(test.queryAs);
    const quest = randomUUID();
    await trips.create(ALEX, quest);
    await trips.saveDraft(ALEX, quest, (await trips.rows(ALEX, quest)).draft!.saved_at_text, questDocument(3));
    const { trip, draft } = await trips.rows(ALEX, quest);
    await trips.publish(ALEX, quest, { draft: draft!.saved_at_text, trip: trip!.saved_at_text }, { slug: 'gone-soon' });
    const blog = await linkedBlog('public', quest);
    expect(await blogs.linkedQuest(blog)).toMatchObject({ key: quest });
    await trips.remove(ALEX, quest);
    expect(await blogs.linkedQuest(blog)).toBeNull();
  });

  it("stops showing a Quest once it's made private", async () => {
    const blog = await linkedBlog('public', GOA);
    const { trip } = await tripFunctions(test.queryAs).rows(ALEX, GOA);
    await tripFunctions(test.queryAs).setVisibility(ALEX, GOA, trip!.saved_at_text, 'private');
    expect(await blogs.linkedQuest(blog)).toBeNull();
  });
});

describe('list_sitemap_blogs', () => {
  it('lists public posted blogs of 80 words or more only', async () => {
    const long = await blogs.posted(ALEX, {
      slug: 'a-long-read',
      document: blogDocument({ body: 'word '.repeat(80) }),
    });
    await blogs.posted(ALEX, {
      visibility: 'unlisted',
      slug: 'long-but-unlisted-k3f9x2',
      document: blogDocument({ body: 'word '.repeat(80) }),
    });
    const rows = await test.queryAs<{ handle: string; slug: string }>(
      undefined,
      'select handle, slug from public.list_sitemap_blogs()',
    );
    expect(rows).toEqual([{ handle: 'alex', slug: long.slug }]);
  });
});
