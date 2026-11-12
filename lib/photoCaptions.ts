import { z } from 'zod';
import { CAPTION_MODEL } from './captions';
import { CAPTION_MAX } from './trip/limits';

// The town and a caption for every photo, from one small picture of all of them (decision 0003).
// Phone browsers strip photo GPS, so the photos themselves are the only reliable clue to where a
// trip was. The browser tiles up to 15 photos into one numbered collage (one image is about half
// the cost of 15), and Claude Haiku answers with the town and a caption per tile number.
// One request per Quest; anything that goes wrong means no answer, never an error.

const API_URL = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 15000;

export type TileInfo = { photoId: string; date?: string };
export type Description = { town: string | null; captions: { photoId: string; caption: string }[] };

const SYSTEM = [
  "You look at one picture made of numbered tiles: someone's trip photos, in order.",
  'First decide the town or city where the trip was, only if a famous landmark, sign or',
  'unmistakable scene makes it clear (for example the Gateway of India means Mumbai).',
  'If you are not sure, the town is null. Never guess.',
  `Then write one catchy caption per tile, at most ${CAPTION_MAX} characters: playful, warm and a`,
  'little cheeky, like a friend captioning their own trip on Instagram. Say what the photo',
  'shows or how it feels; use wordplay on the place or the day when it fits; vary the rhythm so',
  'no two captions start the same way. Plain English, no hashtags, no emoji, no quotation marks.',
  'Never name or describe who a person is, never guess anyone’s identity, age or relationship,',
  'and never read out text that looks private (names, numbers, addresses).',
  'Examples of the voice: "Gateway to a very good day", "Sunday plans: none. Sea: yes",',
  '"Marine Drive, slow lane only", "Another arch, another reason to stay".',
  'Reply with JSON only: {"town": "Mumbai" or null, "captions": [{"n": 1, "caption": "..."}]}',
].join(' ');

/** The tiles' dates as text beside the picture: the only words that go with it. */
export function describePrompt(tiles: TileInfo[]): string {
  return JSON.stringify(tiles.map((tile, index) => ({ n: index + 1, date: tile.date ?? null })));
}

const clean = (text: string, max: number) =>
  [
    ...text
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  ]
    .slice(0, max)
    .join('')
    .trim();

/** The model's reply as a town (or null) and captions for known tile numbers only. */
export function parseDescription(reply: string, tiles: TileInfo[]): Description | null {
  let raw: unknown;
  try {
    raw = JSON.parse(reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1));
  } catch {
    return null;
  }
  const parsed = z
    .object({
      town: z.string().nullable().optional(),
      captions: z.array(z.object({ n: z.number().int(), caption: z.string() })).optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return null;
  const town = parsed.data.town ? clean(parsed.data.town, 60) : '';
  const seen = new Set<number>();
  const captions = (parsed.data.captions ?? []).flatMap(({ n, caption }) => {
    const tile = tiles[n - 1];
    const text = clean(caption, CAPTION_MAX);
    if (!tile || seen.has(n) || !text) return [];
    seen.add(n);
    return [{ photoId: tile.photoId, caption: text }];
  });
  return { town: town || null, captions };
}

type Deps = { fetch: typeof fetch; apiKey: string | undefined; timeoutMs?: number };

/** `collage` is base64 JPEG data (no data: prefix). */
export async function describePhotos(
  collage: string,
  tiles: TileInfo[],
  { fetch, apiKey, timeoutMs = TIMEOUT_MS }: Deps,
): Promise<Description | null> {
  if (!apiKey || tiles.length === 0) return null;
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: CAPTION_MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: collage } },
              { type: 'text', text: describePrompt(tiles) },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const body = z
      .object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })) })
      .safeParse(await response.json());
    if (!body.success) return null;
    return parseDescription(body.data.content.map((block) => block.text ?? '').join(''), tiles);
  } catch {
    return null;
  }
}
