import { describe, expect, it } from 'vitest';
import { expectNoProblems } from '@/lib/analytics/validate';
import type { BlogViewer } from '@/lib/social/schema';
import {
  blogViewedProperties,
  countsAsReader,
  questClickProperties,
  readEndProperties,
} from './readerEvents';

const viewer = (isOwner: boolean, signedIn = true): BlogViewer => ({
  signedIn,
  liked: false,
  isOwner,
  followingOwner: false,
  linkedQuestHidden: false,
});

describe('countsAsReader', () => {
  it('signed-out and signed-in readers count', () => {
    expect(countsAsReader(true, viewer(false, false))).toBe(true);
    expect(countsAsReader(true, viewer(false))).toBe(true);
  });

  it('the writer never counts, on the public link or their own view', () => {
    expect(countsAsReader(true, viewer(true))).toBe(false);
    expect(countsAsReader(false, viewer(true))).toBe(false);
  });

  it('nothing counts on the owner view, and an unknown viewer counts until it is known', () => {
    expect(countsAsReader(false, null)).toBe(false);
    expect(countsAsReader(true, null)).toBe(true);
  });
});

describe('reader events (analytics v2)', () => {
  const view = {
    blogKey: '00000000-0000-4000-8000-0000000000c1',
    viewId: '7d0c3f5e-2b7a-4c1e-9d58-3f1a2b4c5d6e',
  };
  const writer = '00000000-0000-4000-8000-0000000000aa';

  it('blog_viewed: the writer’s key, flags and the referrer code', () => {
    const properties = blogViewedProperties({
      ...view,
      authorKey: writer,
      signedIn: false,
      referrer: 'instagram',
      hasQuest: true,
    });
    expect(properties).toEqual({
      blog_id: view.blogKey,
      view_id: view.viewId,
      author_user_id: writer,
      signed_in_flg: false,
      referrer: 2,
      has_quest_flg: true,
    });
    expectNoProblems('blog_viewed', properties);
    const codes = { none: 0, whatsapp: 1, instagram: 2, other: 3 } as const;
    for (const [referrer, code] of Object.entries(codes) as [keyof typeof codes, number][]) {
      const sent = blogViewedProperties({
        ...view,
        authorKey: writer,
        signedIn: true,
        referrer,
        hasQuest: false,
      });
      expect(sent.referrer).toBe(code);
      expectNoProblems('blog_viewed', sent);
    }
  });

  it('blog_quest_click (was blog_quest_opened) and blog_read_end', () => {
    expect(questClickProperties(view)).toEqual({ blog_id: view.blogKey, view_id: view.viewId });
    expectNoProblems('blog_quest_click', questClickProperties(view));
    expect(readEndProperties(view, 12)).toEqual({ blog_id: view.blogKey, view_id: view.viewId, seconds: 12 });
    expectNoProblems('blog_read_end', readEndProperties(view, 12));
  });
});
