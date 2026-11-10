import { describe, expect, it } from 'vitest';
import { intentStep, readQuestIntent, withoutIntent } from './questIntent';

describe('readQuestIntent', () => {
  it('reads like and comment', () => {
    expect(readQuestIntent('?intent=like&ref=abc')).toBe('like');
    expect(readQuestIntent('?intent=comment')).toBe('comment');
  });

  it('ignores other and unknown intents', () => {
    expect(readQuestIntent('?intent=make_your_own')).toBeNull();
    expect(readQuestIntent('?intent=delete')).toBeNull();
    expect(readQuestIntent('')).toBeNull();
  });
});

describe('withoutIntent', () => {
  it('drops intent and ref and keeps the rest', () => {
    expect(withoutIntent('/@riya/goa', '?intent=like&ref=x&n=email', '#comments')).toBe(
      '/@riya/goa?n=email#comments',
    );
    expect(withoutIntent('/@riya/goa', '?intent=like', '')).toBe('/@riya/goa');
  });
});

describe('intentStep', () => {
  const signedIn = { signedIn: true, liked: false };

  it('likes once, and not again when already liked', () => {
    expect(intentStep('like', signedIn)).toBe('like');
    expect(intentStep('like', { signedIn: true, liked: true })).toBeNull();
  });

  it('opens the comments for a comment intent', () => {
    expect(intentStep('comment', signedIn)).toBe('open_comments');
  });

  it('does nothing signed out or without an intent', () => {
    expect(intentStep('like', { signedIn: false, liked: false })).toBeNull();
    expect(intentStep(null, signedIn)).toBeNull();
  });
});
