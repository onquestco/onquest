import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteBlogDraft, discardBlogDraft } from './actions';

// deleteBlogDraft and discardBlogDraft (they share the delete steps) with a fake database
// (blogs-editor spec §4.2). The real delete is covered by
// tests/db/blogDelete.test.ts; this checks the order, the guard and which event and tags go out.

const KEY = '00000000-0000-4000-8000-000000000001';

// vi.mock factories are hoisted above everything else, so what they use is hoisted too.
const { USER, mocks } = vi.hoisted(() => ({
  USER: '00000000-0000-4000-8000-0000000000aa',
  mocks: {
    calls: [] as string[],
    rpc: vi.fn(),
    loadOwnBlog: vi.fn(),
    deleteQuestFiles: vi.fn(),
    trackServer: vi.fn(),
    refreshBlogPages: vi.fn(),
  },
}));

vi.mock('next/server', () => ({ after: (work: () => unknown) => work() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: USER } } }) },
    rpc: mocks.rpc,
  }),
}));
vi.mock('@/features/blogs/blogRows', () => ({ loadOwnBlog: mocks.loadOwnBlog, ownsBlog: vi.fn() }));
vi.mock('@/lib/storage', () => ({ deleteQuestFiles: mocks.deleteQuestFiles }));
vi.mock('@/lib/analytics/server', () => ({ trackServer: mocks.trackServer }));
vi.mock('@/features/blogs/refreshBlog', () => ({ refreshBlogPages: mocks.refreshBlogPages }));
vi.mock('@/lib/geoServer', () => ({ geocoderFor: vi.fn() }));

function ownBlog(status: 'draft' | 'published', linkedQuestKey?: string) {
  return {
    blog: { key: KEY, status },
    draft: {
      document: {
        body: 'Two days in Panjim.',
        photos: [{ id: '00000000-0000-4000-8000-000000000101', width: 4, height: 3 }],
        linkedQuestKey,
      },
    },
  };
}

beforeEach(() => {
  mocks.calls.length = 0;
  vi.clearAllMocks();
  mocks.deleteQuestFiles.mockImplementation(async () => void mocks.calls.push('files'));
  mocks.rpc.mockImplementation(async (name: string) => {
    mocks.calls.push(name);
    return { data: { handles: ['riya'], slug: null }, error: null };
  });
});

describe('deleteBlogDraft', () => {
  it('deletes the files before the rows, with no cache tags, and fires blog_deleted', async () => {
    mocks.loadOwnBlog.mockResolvedValue(ownBlog('draft'));
    expect(await deleteBlogDraft({ key: KEY })).toEqual({ ok: true, data: { deleted: true } });
    expect(mocks.calls).toEqual(['files', 'delete_blog']);
    expect(mocks.deleteQuestFiles).toHaveBeenCalledWith(expect.anything(), `${USER}/${KEY}`);
    expect(mocks.rpc).toHaveBeenCalledWith('delete_blog', { p_key: KEY });
    expect(mocks.refreshBlogPages).not.toHaveBeenCalled();
    expect(mocks.trackServer).toHaveBeenCalledWith('blog_deleted', USER, {
      blog_id: KEY,
      status: 'draft',
      photos: 1,
      chars_bucket: '1-500',
      has_quest: false,
    });
  });

  it('says whether a Quest was linked', async () => {
    mocks.loadOwnBlog.mockResolvedValue(ownBlog('draft', '00000000-0000-4000-8000-000000000201'));
    await deleteBlogDraft({ key: KEY });
    expect(mocks.trackServer).toHaveBeenCalledWith('blog_deleted', USER, expect.objectContaining({ has_quest: true }));
  });

  it('refuses a posted blog and touches nothing', async () => {
    mocks.loadOwnBlog.mockResolvedValue(ownBlog('published'));
    expect(await deleteBlogDraft({ key: KEY })).toEqual({ ok: true, data: { deleted: false, error: 'published' } });
    expect(mocks.calls).toEqual([]);
    expect(mocks.trackServer).not.toHaveBeenCalled();
  });

  it("answers not_found for a blog that isn't yours or is already gone", async () => {
    mocks.loadOwnBlog.mockResolvedValue(null);
    expect(await deleteBlogDraft({ key: KEY })).toEqual({ ok: true, data: { deleted: false, error: 'not_found' } });
    expect(mocks.calls).toEqual([]);

    mocks.loadOwnBlog.mockResolvedValue(ownBlog('draft'));
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'OQ404', message: 'blog not found' } });
    expect(await deleteBlogDraft({ key: KEY })).toEqual({ ok: true, data: { deleted: false, error: 'not_found' } });
    expect(mocks.trackServer).not.toHaveBeenCalled();
  });

  it('treats a draft posted elsewhere meanwhile as a posted delete: tags and blog_managed', async () => {
    mocks.loadOwnBlog.mockResolvedValue(ownBlog('draft'));
    mocks.rpc.mockResolvedValue({ data: { handles: ['riya', 'riya_k'], slug: 'goa-on-15k' }, error: null });
    expect(await deleteBlogDraft({ key: KEY })).toEqual({ ok: true, data: { deleted: true } });
    expect(mocks.refreshBlogPages).toHaveBeenCalledWith({
      ownerKey: USER,
      blogKey: KEY,
      handles: ['riya', 'riya_k'],
      slugs: ['goa-on-15k'],
    });
    expect(mocks.trackServer).toHaveBeenCalledWith('blog_managed', USER, {
      blog_id: KEY,
      action: 'delete',
      value: 'none',
    });
    expect(mocks.trackServer).not.toHaveBeenCalledWith('blog_deleted', expect.anything(), expect.anything());
  });

  it('fails without detail when the database errors', async () => {
    mocks.loadOwnBlog.mockResolvedValue(ownBlog('draft'));
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '57014', message: 'timeout' } });
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await deleteBlogDraft({ key: KEY })).toEqual({ ok: false, error: 'Something went wrong' });
    quiet.mockRestore();
  });
});

// The empty-composer close goes through the same steps as Delete draft: it must behave as it did
// before they were shared (no event, no tags, a posted blog refused).
describe('discardBlogDraft', () => {
  it('deletes the files before the rows, and sends no event and no tags', async () => {
    mocks.loadOwnBlog.mockResolvedValue(ownBlog('draft'));
    expect(await discardBlogDraft({ key: KEY })).toEqual({ ok: true, data: { discarded: true } });
    expect(mocks.calls).toEqual(['files', 'delete_blog']);
    expect(mocks.deleteQuestFiles).toHaveBeenCalledWith(expect.anything(), `${USER}/${KEY}`);
    expect(mocks.trackServer).not.toHaveBeenCalled();
    expect(mocks.refreshBlogPages).not.toHaveBeenCalled();
  });

  it('refuses a posted blog and touches nothing', async () => {
    mocks.loadOwnBlog.mockResolvedValue(ownBlog('published'));
    expect(await discardBlogDraft({ key: KEY })).toEqual({
      ok: true,
      data: { discarded: false, error: 'published' },
    });
    expect(mocks.calls).toEqual([]);
  });

  it("answers not_found for a blog that isn't yours or is already gone", async () => {
    mocks.loadOwnBlog.mockResolvedValue(null);
    expect(await discardBlogDraft({ key: KEY })).toEqual({
      ok: true,
      data: { discarded: false, error: 'not_found' },
    });
    expect(mocks.calls).toEqual([]);

    mocks.loadOwnBlog.mockResolvedValue(ownBlog('draft'));
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'OQ404', message: 'blog not found' } });
    expect(await discardBlogDraft({ key: KEY })).toEqual({
      ok: true,
      data: { discarded: false, error: 'not_found' },
    });
  });

  it('fails without detail when the database errors', async () => {
    mocks.loadOwnBlog.mockResolvedValue(ownBlog('draft'));
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '57014', message: 'timeout' } });
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await discardBlogDraft({ key: KEY })).toEqual({ ok: false, error: 'Something went wrong' });
    quiet.mockRestore();
  });
});
