import { describe, expect, it } from 'vitest';
import type { BlogViewer } from '@/lib/social/schema';
import { countsAsReader } from './readerEvents';

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
