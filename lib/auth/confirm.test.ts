import { describe, expect, it } from 'vitest';
import { confirmEmailLink, LINK_EXPIRED } from './confirm';

const signedIn = new Set<string>();
const deps = (profile = true) => ({
  verifyOtp: async (tokenHash: string) => {
    if (tokenHash !== 'good') return { ok: false };
    signedIn.add(tokenHash);
    return { ok: true };
  },
  hasProfile: async () => profile,
});

const link = (query: Record<string, string>) => new URLSearchParams({ type: 'email', ...query });

describe('confirmEmailLink', () => {
  it('signs in a browser that never asked for the link and lands on next', async () => {
    signedIn.clear();
    const to = await confirmEmailLink(
      link({ token_hash: 'good', next: '/@riya/goa', intent: 'like' }),
      deps(),
    );
    expect(signedIn.has('good')).toBe(true);
    expect(to).toBe('/@riya/goa?intent=like');
  });

  it('sends a first-time user to pick a username, keeping the return', async () => {
    const to = await confirmEmailLink(link({ token_hash: 'good', next: '/quests/new' }), deps(false));
    expect(to).toBe('/onboarding?next=%2Fquests%2Fnew');
  });

  it('turns an unsafe next into /home', async () => {
    expect(await confirmEmailLink(link({ token_hash: 'good', next: 'https://evil.example' }), deps())).toBe(
      '/home',
    );
  });

  it('shows the expired-link error for a bad, missing or wrong-type token', async () => {
    expect(await confirmEmailLink(link({ token_hash: 'stale' }), deps())).toBe(LINK_EXPIRED);
    expect(await confirmEmailLink(link({}), deps())).toBe(LINK_EXPIRED);
    expect(await confirmEmailLink(new URLSearchParams({ token_hash: 'good', type: 'signup' }), deps())).toBe(
      LINK_EXPIRED,
    );
  });
});
