import { describe, expect, it } from 'vitest';
import { expectNoProblems } from '@/lib/analytics/validate';
import { signedInProperties, signedUpProperties, signInClickProperties } from './signInProperties';

// sign_in_click, user_signed_up and user_signed_in fill every required property from what the
// sign-in return carries, and never the email.

const QUEST_KEY = '00000000-0000-4000-8000-0000000000a1';
const BLOG_KEY = '00000000-0000-4000-8000-0000000000b1';
const NOW = new Date('2026-11-28T10:00:00.000Z');

describe('sign_in_click', () => {
  it('sends the method, the source code and the tap time', () => {
    const properties = signInClickProperties('google', { next: '/home' }, NOW);
    expectNoProblems('sign_in_click', properties);
    expect(properties).toEqual({ method: 'google', source: 0, client_ts: '2026-11-28T10:00:00.000Z' });
  });

  it.each([
    [{ next: '/home' }, 0],
    [{ next: '/quests/new', intent: 'make_your_own' as const, ref: QUEST_KEY }, 1],
    [{ next: '/blogs/new?source=write_your_own' }, 2],
    [{ next: '/@riya/goa', intent: 'like' as const, ref: QUEST_KEY }, 3],
    [{ next: '/@riya', source: 'other' as const }, 3],
  ])('%j is source %i', (signInReturn, source) => {
    const properties = signInClickProperties('email_link', signInReturn, NOW);
    expectNoProblems('sign_in_click', properties);
    expect(properties.source).toBe(source);
  });
});

describe('user_signed_in', () => {
  it('sends the method and source only', () => {
    const properties = signedInProperties('email_link', { next: '/@riya/goa', intent: 'comment', ref: QUEST_KEY });
    expectNoProblems('user_signed_in', properties);
    expect(properties).toEqual({ method: 'email_link', source: 3 });
  });
});

describe('user_signed_up', () => {
  it('has no referrer without a ref', () => {
    const properties = signedUpProperties('google', { next: '/home' });
    expectNoProblems('user_signed_up', properties);
    expect(properties).toEqual({ method: 'google', source: 0 });
  });

  it('names the Quest the person was on', () => {
    const properties = signedUpProperties('google', { next: '/quests/new', intent: 'make_your_own', ref: QUEST_KEY });
    expectNoProblems('user_signed_up', properties);
    expect(properties).toEqual({
      method: 'google',
      source: 1,
      referrer_quest_id: QUEST_KEY,
      referrer_content_type: 0,
    });
  });

  it('names the blog when sign-in returns to a blog page', () => {
    const properties = signedUpProperties('google', { next: '/@riya/blog/monsoon-food', intent: 'like', ref: BLOG_KEY });
    expectNoProblems('user_signed_up', properties);
    expect(properties).toEqual({
      method: 'google',
      source: 3,
      referrer_blog_id: BLOG_KEY,
      referrer_content_type: 1,
    });
  });
});
