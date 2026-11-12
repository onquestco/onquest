import { describe, expect, it } from 'vitest';
import { describePhotos, describePrompt, parseDescription } from './photoCaptions';

const tiles = [{ photoId: 'a', date: '2026-12-11' }, { photoId: 'b' }];

describe('photo captions from a collage', () => {
  it('sends only tile numbers and dates as text', () => {
    expect(describePrompt(tiles)).toBe('[{"n":1,"date":"2026-12-11"},{"n":2,"date":null}]');
  });

  it('reads the town and captions by tile number', () => {
    const reply =
      'Sure! {"town": "Mumbai", "captions": [{"n": 2, "caption": "Sea: yes"}, {"n": 1, "caption": "Gateway to a good day"}]}';
    expect(parseDescription(reply, tiles)).toEqual({
      town: 'Mumbai',
      captions: [
        { photoId: 'b', caption: 'Sea: yes' },
        { photoId: 'a', caption: 'Gateway to a good day' },
      ],
    });
  });

  it('drops unknown tiles, repeats, blanks, and a null town', () => {
    const reply =
      '{"town": null, "captions": [{"n": 9, "caption": "x"}, {"n": 1, "caption": "  "}, {"n": 2, "caption": "One"}, {"n": 2, "caption": "Two"}]}';
    expect(parseDescription(reply, tiles)).toEqual({
      town: null,
      captions: [{ photoId: 'b', caption: 'One' }],
    });
  });

  it('gives nothing for a reply that is not JSON', () => {
    expect(parseDescription('no idea', tiles)).toBeNull();
  });

  it('gives nothing without an API key, and never throws on a failed call', async () => {
    const failing = (() => Promise.reject(new Error('down'))) as unknown as typeof fetch;
    expect(await describePhotos('abc', tiles, { fetch: failing, apiKey: undefined })).toBeNull();
    expect(await describePhotos('abc', tiles, { fetch: failing, apiKey: 'key' })).toBeNull();
  });
});
