import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestDocumentSchema } from '@/lib/trip/schema';
import { createQuest } from './actions';
import { reportCreateProgress } from './arrangeActions';
import { publishQuest } from './publishActions';

// The create flow's server events go out only after the write they count has succeeded
// (analytics v2 §10), with a fake database. The builders' values are in createEvents.test.ts.

const KEY = '00000000-0000-4000-8000-000000000001';
const STARTED = '2026-11-27T10:00:00.000Z';

// vi.mock factories are hoisted above everything else, so what they use is hoisted too.
const { USER, mocks } = vi.hoisted(() => ({
  USER: '00000000-0000-4000-8000-0000000000aa',
  mocks: {
    rpc: vi.fn(),
    loadOwnTrip: vi.fn(),
    trackServer: vi.fn(),
    refreshQuestPages: vi.fn(),
    /** What each table's reads answer: `head` is the count query. */
    tables: {} as Record<string, { row?: unknown; count?: number | null; error?: unknown }>,
  },
}));

/** A chainable stand-in for the Supabase query builder: every read answers from mocks.tables. */
function fakeFrom(table: string) {
  let head = false;
  const answer = () => {
    const { row = null, count = null, error = null } = mocks.tables[table] ?? {};
    return head ? { count, error } : { data: row, error };
  };
  const query = {
    select: (_columns: string, options?: { head?: boolean }) => {
      head = options?.head === true;
      return query;
    },
    eq: () => query,
    neq: () => query,
    maybeSingle: async () => answer(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(answer()).then(resolve),
  };
  return query;
}

vi.mock('next/server', () => ({ after: (work: () => unknown) => work() }));
vi.mock('next/font/google', () => import('@/templates/shared/nextFontStub'));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: USER, created_at: '2026-11-20T10:00:00Z' } } }) },
    rpc: mocks.rpc,
    from: fakeFrom,
  }),
}));
vi.mock('@/features/account/getCurrentUser', () => ({
  getMyProfile: async () => ({ handle: 'riya', name: 'Riya' }),
}));
vi.mock('./questRows', () => ({ loadOwnTrip: mocks.loadOwnTrip }));
vi.mock('./refreshTrip', () => ({ refreshQuestPages: mocks.refreshQuestPages, refreshQuestSocial: vi.fn() }));
vi.mock('@/lib/storage', () => ({
  photoUrls: () => ({ thumb: 'thumb.webp', display: 'display.webp' }),
  listPhotoIds: async () => [],
  photoUploadedAt: vi.fn(),
  deletePhotoFiles: vi.fn(),
  deleteQuestFiles: vi.fn(),
}));
vi.mock('@/lib/analytics/server', () => ({ trackServer: mocks.trackServer }));
vi.mock('@/lib/geoServer', () => ({ geocoderFor: vi.fn() }));

const datedPhoto = (n: number, date: string) => ({
  id: `00000000-0000-4000-8000-00000000010${n}`,
  width: 1600,
  height: 1200,
  date,
});

function ownTrip(published: boolean) {
  const photos = [datedPhoto(1, '2026-07-01'), datedPhoto(2, '2026-07-01'), datedPhoto(3, '2026-07-02')];
  return {
    trip: {
      key: KEY,
      status: published ? 'published' : 'draft',
      visibility: 'public',
      slug: published ? 'goa' : '',
      seed: 7,
      published_at: published ? '2026-11-20T09:00:00Z' : null,
      comments_on: true,
      saved_at_text: 'trip-saved',
      published_draft_saved_at_text: null,
    },
    draft: {
      saved_at_text: 'draft-saved',
      document: QuestDocumentSchema.parse({
        templateId: 'coastal',
        title: 'Goa',
        startedAt: STARTED,
        content: {
          favourites: [],
          days: [{ id: '00000000-0000-4000-8000-000000000201', placeIds: [], photoIds: photos.map((each) => each.id) }],
        },
        photos,
        places: [],
      }),
    },
  };
}

const publishInput = {
  key: KEY,
  basedOnDraft: 'draft-saved',
  basedOnTrip: 'trip-saved',
  visibility: 'unlisted',
  title: 'Monsoon in Goa',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tables = {};
});

describe('createQuest → quest_draft_created', () => {
  it('is sent once the draft row exists, with the source as click_loc', async () => {
    mocks.rpc.mockResolvedValue({ data: 'saved', error: null });
    const result = await createQuest({ key: KEY, source: 'home_banner', startedAt: STARTED });
    expect(result).toMatchObject({ ok: true, data: { created: true } });
    expect(mocks.trackServer).toHaveBeenCalledExactlyOnceWith('quest_draft_created', USER, {
      quest_id: KEY,
      click_loc: 0,
    });
  });

  it('is not sent when the draft already existed or the write failed', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'OQ410', message: 'exists' } });
    expect(await createQuest({ key: KEY, source: 'create_menu', startedAt: STARTED })).toEqual({
      ok: true,
      data: { created: false, error: 'exists' },
    });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '57014', message: 'timeout' } });
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await createQuest({ key: KEY, source: 'create_menu', startedAt: STARTED })).toMatchObject({ ok: false });
    quiet.mockRestore();
    expect(mocks.trackServer).not.toHaveBeenCalled();
  });
});

describe('reportCreateProgress → quest_arranged', () => {
  const arranged = { pages: 1, photos: 3, captionsWritten: 2, fallbackUsed: false, failed: false, durationMs: 9000 };

  it('is sent for an arranging report on your own draft', async () => {
    mocks.loadOwnTrip.mockResolvedValue(ownTrip(false));
    expect(await reportCreateProgress({ key: KEY, arranged })).toEqual({ ok: true, data: { reported: true } });
    expect(mocks.trackServer).toHaveBeenCalledExactlyOnceWith(
      'quest_arranged',
      USER,
      expect.objectContaining({ quest_id: KEY, photo_count: 3, arrange_mode: 0, failed_flg: false }),
    );
  });

  it('is not sent for an upload-only report or a draft that isn’t yours', async () => {
    mocks.loadOwnTrip.mockResolvedValue(ownTrip(false));
    const uploaded = { count: 3, failed: 0, heic: 1, bytesTotal: 1_000_000 };
    expect(await reportCreateProgress({ key: KEY, uploaded })).toEqual({ ok: true, data: { reported: true } });
    mocks.loadOwnTrip.mockResolvedValue(null);
    expect(await reportCreateProgress({ key: KEY, arranged })).toEqual({
      ok: true,
      data: { reported: false, error: 'not_found' },
    });
    expect(mocks.trackServer).not.toHaveBeenCalled();
  });
});

describe('publishQuest → quest_creation_complete / quest_updated', () => {
  it('first publish sends quest_creation_complete with the browser’s analytics', async () => {
    mocks.loadOwnTrip.mockResolvedValue(ownTrip(false));
    mocks.tables = {
      trips: { row: null, count: 0 },
      profiles: { row: { settings: { defaultVisibility: 'private' } } },
    };
    mocks.rpc.mockResolvedValue({ data: { saved_at: 's2', slug: 'monsoon-in-goa', first_publish: true }, error: null });
    const result = await publishQuest({ ...publishInput, analytics: { clickLoc: 5, editCount: 2 } });
    expect(result).toMatchObject({ ok: true, data: { published: true, firstPublish: true } });
    expect(mocks.trackServer).toHaveBeenCalledExactlyOnceWith(
      'quest_creation_complete',
      USER,
      expect.objectContaining({
        quest_id: KEY,
        title_length: 14,
        visibility: 1,
        default_visibility: 2,
        click_loc: 5,
        edit_count: 2,
        is_first_quest_flg: true,
        days_since_signup: expect.any(Number),
      }),
    );
  });

  it('a later publish sends quest_updated, with the template it had before', async () => {
    mocks.loadOwnTrip.mockResolvedValue(ownTrip(true));
    mocks.tables = { trips: { row: { template_id: 'alpine' } } };
    mocks.rpc.mockResolvedValue({ data: { saved_at: 's3', slug: 'goa', first_publish: false }, error: null });
    await publishQuest({ ...publishInput, visibility: 'public', analytics: { changeTypes: [7, 1] } });
    expect(mocks.trackServer).toHaveBeenCalledExactlyOnceWith(
      'quest_updated',
      USER,
      expect.objectContaining({ quest_id: KEY, change_types: '1,7', template_changed_flg: true, visibility: 0 }),
    );
  });

  it('an old bundle (no analytics) still publishes and still sends the event', async () => {
    mocks.loadOwnTrip.mockResolvedValue(ownTrip(false));
    mocks.rpc.mockResolvedValue({ data: { saved_at: 's2', slug: 'goa', first_publish: true }, error: null });
    expect(await publishQuest(publishInput)).toMatchObject({ ok: true, data: { published: true } });
    expect(mocks.trackServer).toHaveBeenCalledOnce();
    expect(mocks.trackServer.mock.calls[0]?.[2]).not.toHaveProperty('click_loc', expect.anything());
  });

  it('malformed analytics never fail the publish', async () => {
    mocks.loadOwnTrip.mockResolvedValue(ownTrip(false));
    mocks.rpc.mockResolvedValue({ data: { saved_at: 's2', slug: 'goa', first_publish: true }, error: null });
    const result = await publishQuest({ ...publishInput, analytics: { clickLoc: 99, changeTypes: [1, 1] } });
    expect(result).toMatchObject({ ok: true, data: { published: true } });
    expect(mocks.trackServer.mock.calls[0]?.[2]).not.toHaveProperty('click_loc', expect.anything());
  });

  it('nothing is sent when the publish is refused', async () => {
    mocks.loadOwnTrip.mockResolvedValue(ownTrip(true));
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'OQ409', message: 'conflict' } });
    expect(await publishQuest(publishInput)).toEqual({ ok: true, data: { published: false, error: 'conflict' } });
    expect(mocks.trackServer).not.toHaveBeenCalled();
  });
});
