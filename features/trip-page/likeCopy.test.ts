import { describe, expect, it } from 'vitest';
import { charactersLeft, likeLabel, toggledLike } from './likeCopy';

describe('likeLabel', () => {
  it('invites the first like instead of showing a zero', () => {
    expect(likeLabel(0, false)).toBe('Be the first to like this');
  });
  it('hides the count at 1 and 2 likes', () => {
    expect(likeLabel(1, true)).toBe('Liked');
    expect(likeLabel(2, false)).toBe('Like');
  });
  it('shows the number from 3 likes, for owners and viewers alike', () => {
    expect(likeLabel(3, false)).toBe('3 likes');
    expect(likeLabel(24, true)).toBe('24 likes');
  });
});

describe('toggledLike', () => {
  it('adds and removes one like', () => {
    expect(toggledLike({ liked: false, likeCount: 2 })).toEqual({ liked: true, likeCount: 3 });
    expect(toggledLike({ liked: true, likeCount: 3 })).toEqual({ liked: false, likeCount: 2 });
  });
  it('never goes below zero', () => {
    expect(toggledLike({ liked: true, likeCount: 0 })).toEqual({ liked: false, likeCount: 0 });
  });
});

describe('charactersLeft', () => {
  it('stays quiet until 40 characters are left', () => {
    expect(charactersLeft('a'.repeat(259), 300)).toBeNull();
    expect(charactersLeft('a'.repeat(260), 300)).toBe(40);
  });
  it('counts an emoji as one character', () => {
    expect(charactersLeft('😍'.repeat(290), 300)).toBe(10);
  });
});
