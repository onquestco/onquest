import { describe, expect, it } from 'vitest';
import { matchesFilter, questTag } from './questFilters';

describe('matchesFilter', () => {
  it('splits published from drafts', () => {
    expect(matchesFilter('all', { status: 'draft' })).toBe(true);
    expect(matchesFilter('published', { status: 'published' })).toBe(true);
    expect(matchesFilter('published', { status: 'draft' })).toBe(false);
    expect(matchesFilter('drafts', { status: 'draft' })).toBe(true);
    expect(matchesFilter('drafts', { status: 'published' })).toBe(false);
  });
});

describe('questTag', () => {
  it('tags drafts, unlisted and private Quests, never public ones', () => {
    expect(questTag({ status: 'draft', visibility: 'public' })).toBe('Draft');
    expect(questTag({ status: 'published', visibility: 'unlisted' })).toBe('Unlisted');
    expect(questTag({ status: 'published', visibility: 'private' })).toBe('Private');
    expect(questTag({ status: 'published', visibility: 'public' })).toBeNull();
  });
});
