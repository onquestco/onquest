import { describe, expect, it } from 'vitest';
import type { QuestDocument } from '@/lib/trip/schema';
import { captionTargets, withCaptions } from './captionTargets';

const PLACE = '00000000-0000-4000-8000-0000000000b1';
const document: QuestDocument = {
  templateId: 'beach',
  content: { favourites: [], days: [] },
  places: [{ id: PLACE, name: 'Panjim', lat: 15.49, lng: 73.83 }],
  photos: [
    { id: '00000000-0000-4000-8000-0000000000c1', width: 1, height: 1, placeId: PLACE, date: '2026-10-17' },
    { id: '00000000-0000-4000-8000-0000000000c2', width: 1, height: 1 },
    {
      id: '00000000-0000-4000-8000-0000000000c3',
      width: 1,
      height: 1,
      placeId: PLACE,
      caption: 'Mine',
      captionSource: 'user',
    },
  ],
};

describe('captionTargets', () => {
  it('picks photos with a place and no caption, with the town and date only', () => {
    expect(captionTargets(document)).toEqual([
      { photoId: '00000000-0000-4000-8000-0000000000c1', town: 'Panjim', date: '2026-10-17' },
    ]);
  });
});

describe('withCaptions', () => {
  it('writes captions in as automatic and never replaces one the person wrote', () => {
    const result = withCaptions(document, [
      { photoId: '00000000-0000-4000-8000-0000000000c1', caption: 'Morning in Panjim' },
      { photoId: '00000000-0000-4000-8000-0000000000c3', caption: 'Model text' },
    ]);
    expect(result.photos[0]).toMatchObject({ caption: 'Morning in Panjim', captionSource: 'auto' });
    expect(result.photos[2]).toMatchObject({ caption: 'Mine', captionSource: 'user' });
  });
});
