import { describe, expect, it } from 'vitest';
import { captionPrompt, parseCaptions, writeCaptions, type CaptionItem } from './captions';

// The model is mocked: what goes in (only town and date) and what comes out (≤ 60 characters,
// known photos only, nothing on failure).

const items: CaptionItem[] = [
  { photoId: 'a', town: 'Panjim', date: '2026-10-17' },
  { photoId: 'b', town: 'Palolem' },
];

function modelReturning(text: string, status = 200) {
  const requests: { body: string; headers: Record<string, string> }[] = [];
  const fetch = (async (_url: string, init: RequestInit) => {
    requests.push({ body: String(init.body), headers: init.headers as Record<string, string> });
    return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, requests };
}

describe('captionPrompt', () => {
  it('sends only photo ids, towns and dates', () => {
    expect(JSON.parse(captionPrompt(items))).toEqual([
      { photoId: 'a', town: 'Panjim', date: '2026-10-17' },
      { photoId: 'b', town: 'Palolem', date: null },
    ]);
  });
});

describe('parseCaptions', () => {
  it('keeps known photos once, as one line of at most 60 characters', () => {
    const reply = `Here you go:\n${JSON.stringify([
      { photoId: 'a', caption: 'Sunset over the Mandovi\nin Panjim' },
      { photoId: 'a', caption: 'Duplicate' },
      { photoId: 'zzz', caption: 'Not ours' },
      { photoId: 'b', caption: 'x'.repeat(80) },
    ])}`;
    expect(parseCaptions(reply, ['a', 'b'])).toEqual([
      { photoId: 'a', caption: 'Sunset over the Mandovi in Panjim' },
      { photoId: 'b', caption: 'x'.repeat(60) },
    ]);
  });

  it('returns nothing for a reply that is not the JSON asked for', () => {
    expect(parseCaptions('Sorry, I cannot help with that.', ['a'])).toEqual([]);
    expect(parseCaptions('[{"photo": "a"}]', ['a'])).toEqual([]);
  });
});

describe('writeCaptions', () => {
  it('makes one request to Haiku and returns the captions', async () => {
    const { fetch, requests } = modelReturning('[{"photoId": "a", "caption": "Morning walk in Panjim"}]');
    expect(await writeCaptions(items, { fetch, apiKey: 'test-key' })).toEqual([
      { photoId: 'a', caption: 'Morning walk in Panjim' },
    ]);
    expect(requests).toHaveLength(1);
    expect(JSON.parse(requests[0]!.body).model).toBe('claude-haiku-5-5');
  });

  it('returns no captions on an error answer, a timeout or without a key', async () => {
    expect(await writeCaptions(items, { ...modelReturning('', 500), apiKey: 'k' })).toEqual([]);
    const hanging = (() => new Promise(() => {})) as unknown as typeof fetch;
    const slow = (async (_url: string, init: RequestInit) =>
      new Promise((_, reject) =>
        init.signal?.addEventListener('abort', () => reject(new Error('timeout'))),
      )) as unknown as typeof fetch;
    expect(await writeCaptions(items, { fetch: slow, apiKey: 'k', timeoutMs: 10 })).toEqual([]);
    expect(await writeCaptions(items, { fetch: hanging, apiKey: undefined })).toEqual([]);
  });
});
