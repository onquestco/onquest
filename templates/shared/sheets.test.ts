import { describe, expect, it } from 'vitest';
import { goaTrip } from '@/lib/demo/goaTrip';
import { buildSheets, parseSheetKey, sheetKeyForPhoto } from './sheets';

describe('parseSheetKey', () => {
  it('reads a day key with a photo index', () =>
    expect(parseSheetKey('day:2:1')).toEqual({ id: 'day:2', photoIndex: 1 }));
  it('defaults the photo index to 0', () =>
    expect(parseSheetKey('day:0')).toEqual({ id: 'day:0', photoIndex: 0 }));
  it('passes other keys through', () =>
    expect(parseSheetKey('place:3')).toEqual({ id: 'place:3', photoIndex: 0 }));
});

describe('buildSheets', () => {
  const sheets = buildSheets(goaTrip);

  it('has one sheet per place, per day, and the note', () => {
    expect(Object.keys(sheets)).toHaveLength(goaTrip.places.length + goaTrip.days.length + 1);
  });

  it('pads day numbers in the kicker', () => expect(sheets['day:0']?.kicker).toBe('Day 01'));

  it('leaves out the note sheet when there is no note', () => {
    expect(buildSheets({ ...goaTrip, note: undefined }).note).toBeUndefined();
  });
});

describe('sheetKeyForPhoto', () => {
  it('opens the place for a place photo', () =>
    expect(sheetKeyForPhoto(goaTrip, goaTrip.places[1]!.photo!.id)).toBe('place:1'));
  it('opens the day for a day photo', () =>
    expect(sheetKeyForPhoto(goaTrip, goaTrip.days[2]!.photos[1]!.id)).toBe('day:2:1'));
  it('returns undefined for unknown photos', () => expect(sheetKeyForPhoto(goaTrip, 'nope')).toBeUndefined());
});
