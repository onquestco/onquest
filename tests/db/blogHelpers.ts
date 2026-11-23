import { randomUUID } from 'node:crypto';
import type { createTestDatabase } from './testDatabase';

// Shared steps for the blog tests (migration 16): a document, the feature flag and the save
// functions, called the way the server actions call them.

type Test = Awaited<ReturnType<typeof createTestDatabase>>;
type Row = Record<string, unknown> & { saved_at_text: string };

export const blogPhoto = () => ({ id: randomUUID(), width: 1600, height: 1200 });

export function blogDocument(extra: Record<string, unknown> = {}) {
  return {
    title: 'Goa on 15k',
    body: 'Three days, one scooter and far too much bebinca.\n\nWe started in Panjim.',
    photos: [blogPhoto(), blogPhoto()],
    ...extra,
  };
}

/** Runs SQL as the server (service role), signed in as nobody. */
export async function asServiceRole<T>(test: Test, sql: string, params: unknown[] = []) {
  await test.db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  await test.db.exec('set role service_role');
  try {
    return (await test.db.query<T>(sql, params)).rows;
  } finally {
    await test.db.exec('reset role');
  }
}

export function blogFunctions(test: Test) {
  const { queryAs } = test;
  const one = async <T>(user: string | undefined, sql: string, params: unknown[]) =>
    (await queryAs<{ result: T }>(user, sql, params))[0]!.result;
  const rows = async (user: string, key: string) => ({
    blog: (
      await queryAs<Row>(user, 'select *, saved_at::text as saved_at_text from public.blogs where key = $1', [key])
    )[0],
    draft: (
      await queryAs<Row>(user, 'select *, saved_at::text as saved_at_text from public.blog_drafts where key = $1', [
        key,
      ])
    )[0],
  });
  const tokens = async (user: string, key: string) => {
    const { blog, draft } = await rows(user, key);
    return { blog: blog!.saved_at_text, draft: draft!.saved_at_text };
  };
  const create = (user: string, key: string, document: unknown = blogDocument()) =>
    one<string>(user, 'select public.create_blog($1, $2) as result', [key, document]);
  const publish = async (
    user: string,
    key: string,
    options: { visibility?: string | null; slug?: string; basedOn?: { draft: string; blog: string } } = {},
  ) => {
    const basedOn = options.basedOn ?? (await tokens(user, key));
    return one<{ saved_at: string; slug: string; first_publish: boolean }>(
      user,
      'select public.publish_blog($1, $2, $3, $4, $5) as result',
      [
        key,
        basedOn.draft,
        basedOn.blog,
        options.visibility === undefined ? 'public' : options.visibility,
        options.slug ?? 'goa-on-15k',
      ],
    );
  };

  return {
    one,
    rows,
    tokens,
    create,
    publish,
    grant: (handle: string | null) =>
      asServiceRole(test, 'select public.grant_feature_access($1, $2)', ['blogs', handle]),
    revoke: (handle: string | null) =>
      asServiceRole(test, 'select public.revoke_feature_access($1, $2)', ['blogs', handle]),
    saveDraft: (user: string, key: string, basedOn: string, document: unknown) =>
      one<string>(user, 'select public.save_blog_draft($1, $2, $3) as result', [key, basedOn, document]),
    setVisibility: (user: string, key: string, basedOn: string, visibility: string) =>
      one<string>(user, 'select public.set_blog_visibility($1, $2, $3) as result', [key, basedOn, visibility]),
    setComments: (user: string, key: string, basedOn: string, on: boolean) =>
      one<string>(user, 'select public.set_blog_comments($1, $2, $3) as result', [key, basedOn, on]),
    remove: (user: string, key: string) =>
      one<{ handles: string[]; slug: string | null }>(user, 'select public.delete_blog($1) as result', [key]),
    getBlog: (handle: string, slug: string, user?: string) =>
      one<{ blog: Record<string, unknown>; owner: Record<string, unknown>; photo_folder: string } | null>(
        user,
        'select public.get_blog($1, $2) as result',
        [handle, slug],
      ),
    status: (handle: string, slug: string) =>
      one<string | null>(undefined, 'select public.get_blog_status($1, $2) as result', [handle, slug]),
    linkedQuest: (blogKey: string, user?: string) =>
      one<Record<string, unknown> | null>(user, 'select public.get_blog_quest($1) as result', [blogKey]),
    /** A blog created and posted in one go; returns its key and slug. */
    async posted(
      user: string,
      options: { visibility?: string; slug?: string; document?: Record<string, unknown> } = {},
    ) {
      const key = randomUUID();
      await create(user, key, options.document ?? blogDocument());
      const result = await publish(user, key, { visibility: options.visibility, slug: options.slug });
      return { key, slug: result.slug };
    },
  };
}
