import { describe, expect, it } from 'vitest';
import { reactionError, toQuestSocial } from './socialRows';

describe('toQuestSocial', () => {
  it('turns the database row into the page shape', () => {
    expect(
      toQuestSocial({
        like_count: 3,
        comment_count: 1,
        comments_on: true,
        comments: [
          {
            key: '00000000-0000-4000-8000-000000000001',
            body: 'Lovely',
            saved_at: '2026-11-10T10:00:00+00:00',
            author: {
              key: '00000000-0000-4000-8000-000000000002',
              handle: 'sam',
              name: 'Sam',
              avatar_url: null,
            },
          },
        ],
      }),
    ).toEqual({
      likeCount: 3,
      commentCount: 1,
      commentsOn: true,
      comments: [
        {
          key: '00000000-0000-4000-8000-000000000001',
          body: 'Lovely',
          savedAt: '2026-11-10T10:00:00+00:00',
          author: {
            key: '00000000-0000-4000-8000-000000000002',
            handle: 'sam',
            name: 'Sam',
            avatarUrl: undefined,
          },
        },
      ],
    });
  });
});

describe('reactionError', () => {
  it.each([
    [{ code: 'OQ404', message: 'not visible' }, 'not_visible'],
    [{ code: 'OQ404', message: 'not found' }, 'not_found'],
    [{ code: 'OQ403', message: 'comments off' }, 'comments_off'],
    [{ code: 'OQ403', message: 'not owner' }, 'not_owner'],
    [{ code: 'OQ429', message: 'too fast' }, 'too_fast'],
  ])('maps %j to %s', (error, expected) => {
    expect(reactionError(error)).toBe(expected);
  });
});
