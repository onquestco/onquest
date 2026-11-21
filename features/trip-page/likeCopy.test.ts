import { describe, expect, it } from 'vitest';
import { charactersLeft, likeLabel, toggledLike } from './likeCopy';

describe('likeLabel', () => {
  it('says Like when nobody has liked it yet', () => {
    expect(likeLabel(0)).toBe('Like');
  });
  it('shows the real count from the first like', () => {
    expect(likeLabel(1)).toBe('1 like');
    expect(likeLabel(2)).toBe('2 likes');
    expect(likeLabel(24)).toBe('24 likes');
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
