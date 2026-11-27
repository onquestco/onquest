import { describe, expect, it } from 'vitest';
import { afterSignIn, readSignInReturn, safeNext, signInSource, withSignInReturn } from './next';

const QUEST_KEY = '00000000-0000-4000-8000-0000000000a1';

describe('safeNext', () => {
  it.each(['/@riya/goa-trip', '/quests/new', '/home?tab=quests', '/@riya/goa#comments'])(
    'keeps %s',
    (path) => {
      expect(safeNext(path)).toBe(path);
    },
  );

  it.each([
    undefined,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\tevil',
    'javascript:alert(1)',
    'home',
  ])('sends %j to /home', (path) => {
    expect(safeNext(path)).toBe('/home');
  });
});

describe('readSignInReturn', () => {
  it('keeps a known intent and a Quest key', () => {
    const params = new URLSearchParams({ next: '/@riya/goa', intent: 'like', ref: QUEST_KEY });
    expect(readSignInReturn(params)).toEqual({ next: '/@riya/goa', intent: 'like', ref: QUEST_KEY });
  });

  it('drops unknown intents and refs that are not keys', () => {
    expect(readSignInReturn({ next: '/home', intent: 'admin', ref: '../x' })).toEqual({
      next: '/home',
      intent: undefined,
      ref: undefined,
    });
  });
});

describe('afterSignIn', () => {
  const back = { next: '/@riya/goa', intent: 'comment' as const, ref: QUEST_KEY };

  it('sends new people to pick a username, carrying the return along', () => {
    expect(afterSignIn(back, false)).toBe(withSignInReturn('/onboarding', back));
    expect(readSignInReturn(new URL(afterSignIn(back, false), 'https://x.test').searchParams)).toEqual(back);
  });

  it('sends everyone else back to the Quest with the intent', () => {
    expect(afterSignIn(back, true)).toBe('/@riya/goa?intent=comment');
    expect(afterSignIn({ next: '/@riya/goa?x=1#top', intent: 'like' }, true)).toBe(
      '/@riya/goa?x=1&intent=like#top',
    );
  });

  it('goes straight to next without an intent', () => {
    expect(afterSignIn({ next: '/quests/new' }, true)).toBe('/quests/new');
  });
});

describe('sign-in source (analytics v2: sign_in_click, user_signed_up, user_signed_in)', () => {
  it('rides through sign-in and onboarding with the rest of the return', () => {
    const back = { next: '/@riya', source: 'other' as const };
    const url = new URL(withSignInReturn('/auth/callback', back), 'https://x.test');
    expect(readSignInReturn(url.searchParams)).toEqual(back);
    const onboarding = new URL(afterSignIn(back, false), 'https://x.test');
    expect(readSignInReturn(onboarding.searchParams).source).toBe('other');
  });

  it('drops an unknown source', () => {
    expect(readSignInReturn({ next: '/home', source: 'admin' })).toEqual({ next: '/home' });
    expect('source' in readSignInReturn({ next: '/home', source: 'admin' })).toBe(false);
  });

  it('is not carried back to the page once signed in', () => {
    expect(afterSignIn({ next: '/@riya/goa', intent: 'like', source: 'other' }, true)).toBe(
      '/@riya/goa?intent=like',
    );
  });

  it('is worked out from intent and next when a link did not set it', () => {
    expect(signInSource({ next: '/home' })).toBe('button');
    expect(signInSource({ next: '/@riya/goa', intent: 'like' })).toBe('other');
    expect(signInSource({ next: '/@riya/goa', intent: 'comment' })).toBe('other');
    expect(signInSource({ next: '/quests/new', intent: 'make_your_own' })).toBe('make_your_own_quest');
    expect(signInSource({ next: '/quests/new?source=home_banner' })).toBe('make_your_own_quest');
    expect(signInSource({ next: '/blogs/new?source=write_your_own' })).toBe('make_your_own_blog');
    expect(signInSource({ next: '/home', intent: 'like', source: 'button' })).toBe('button');
  });
});
