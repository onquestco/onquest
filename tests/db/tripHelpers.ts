import { randomUUID } from 'node:crypto';
import type { createTestDatabase } from './testDatabase';

// Shared steps for the trip tests: a Quest document with N photos, and the save functions.

type QueryAs = Awaited<ReturnType<typeof createTestDatabase>>['queryAs'];

export function questDocument(photoCount: number, extra: Record<string, unknown> = {}) {
  const photos = Array.from({ length: photoCount }, (_, i) => ({
    id: randomUUID(),
    width: 1600,
    height: 1200,
    caption: i === 0 ? 'Sunset in Panjim' : undefined,
    takenAt: '2026-10-17T12:00:00Z',
    date: '2026-10-17',
  }));
  return {
    templateId: 'beach',
    title: 'Three days in Goa',
    content: {
      favourites: [],
      days: [{ id: randomUUID(), placeIds: [], photoIds: photos.map((p) => p.id) }],
    },
    photos,
    places: [{ id: randomUUID(), name: 'Panjim', lat: 15.49, lng: 73.82 }],
    ...extra,
  };
}

export function tripFunctions(queryAs: QueryAs) {
  const one = async <T>(user: string | undefined, sql: string, params: unknown[]) =>
    (await queryAs<{ result: T }>(user, sql, params))[0]!.result;
  return {
    create: (user: string, key: string) =>
      one<string>(user, 'select public.create_trip($1) as result', [key]),
    saveDraft: (user: string, key: string, basedOn: string, document: unknown) =>
      one<string>(user, 'select public.save_trip_draft($1, $2, $3) as result', [key, basedOn, document]),
    publish: (
      user: string,
      key: string,
      basedOn: { draft: string; trip: string },
      options: { visibility?: string; title?: string; slug?: string; words?: number } = {},
    ) =>
      one<{ saved_at: string; slug: string; first_publish: boolean }>(
        user,
        'select public.publish_trip($1, $2, $3, $4, $5, $6, $7) as result',
        [
          key,
          basedOn.draft,
          basedOn.trip,
          options.visibility ?? 'public',
          options.title ?? 'Three days in Goa',
          options.slug ?? 'three-days-in-goa',
          options.words ?? 40,
        ],
      ),
    setVisibility: (user: string, key: string, basedOn: string, visibility: string) =>
      one<string>(user, 'select public.set_trip_visibility($1, $2, $3) as result', [
        key,
        basedOn,
        visibility,
      ]),
    setComments: (user: string, key: string, basedOn: string, on: boolean) =>
      one<string>(user, 'select public.set_trip_comments($1, $2, $3) as result', [key, basedOn, on]),
    remove: (user: string, key: string) =>
      one<{ handles: string[]; slug: string }>(user, 'select public.delete_trip($1) as result', [key]),
    /** The live trip and draft rows, with saved_at as text (the conflict tokens). */
    rows: async (user: string, key: string) => ({
      trip: (
        await queryAs<Record<string, unknown> & { saved_at_text: string }>(
          user,
          'select *, saved_at::text as saved_at_text from public.trips where key = $1',
          [key],
        )
      )[0],
      draft: (
        await queryAs<Record<string, unknown> & { saved_at_text: string }>(
          user,
          'select *, saved_at::text as saved_at_text from public.trip_drafts where key = $1',
          [key],
        )
      )[0],
    }),
  };
}
