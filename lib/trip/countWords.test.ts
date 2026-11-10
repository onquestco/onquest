import { describe, expect, it } from 'vitest';
import { goaTrip } from '@/lib/demo/goaTrip';
import { countWords } from './countWords';

describe('countWords', () => {
  it('counts the title, note, day text and place notes', () => {
    expect(countWords({ ...goaTrip, title: 'Two words', note: undefined, days: [], places: [] })).toBe(2);
  });

  it('ignores empty text and extra spaces', () => {
    expect(countWords({ ...goaTrip, title: '  Goa   trip ', note: '', days: [], places: [] })).toBe(2);
  });
});
