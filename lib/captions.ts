import { z } from 'zod';
import { CAPTION_MAX } from './trip/limits';

// Short scrapbook captions from Claude Haiku (spec A §3.5). The prompt is built only from each
// photo's date and town as stored in the draft: no text a person typed ever reaches the model.
// One request per Quest; anything that goes wrong means no captions, never an error.

export const CAPTION_MODEL = 'claude-haiku-5-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 8000;

export type CaptionItem = { photoId: string; town: string; date?: string };
export type Caption = { photoId: string; caption: string };

// Founder, 11 Nov: captions should be catchy, like a friend's Instagram caption, not a
// description. Same facts in (town and date only), more voice out.
const SYSTEM = [
  "You write captions for a travel scrapbook made from someone's trip photos.",
  'For each photo you get only the town and, when known, the date it was taken.',
  `Write one catchy caption per photo, at most ${CAPTION_MAX} characters: playful, warm and`,
  'a little cheeky, like a friend captioning their own trip on Instagram. Use wordplay on the',
  'place name, the weekday or the time of year when it fits; vary the rhythm so no two',
  'captions start the same way. Plain English, no hashtags, no emoji, no quotation marks.',
  'Never invent people, names, food, weather or events the photo might not show; keep it to',
  'the place, the day and the feeling of being there.',
  'Examples of the voice: "Panjim, you had me at hello", "Sunday plans: none. Baga: yes",',
  '"Manali said slow down. Done", "Another day, another reason to stay".',
  'Reply with JSON only: [{"photoId": "...", "caption": "..."}]',
].join(' ');

export function captionPrompt(items: CaptionItem[]): string {
  return JSON.stringify(items.map(({ photoId, town, date }) => ({ photoId, town, date: date ?? null })));
}

/** Captions from the model's reply: known photo ids only, plain single-line text, ≤ 60 characters. */
export function parseCaptions(reply: string, photoIds: string[]): Caption[] {
  const json = reply.slice(reply.indexOf('['), reply.lastIndexOf(']') + 1);
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  const parsed = z.array(z.object({ photoId: z.string(), caption: z.string() })).safeParse(raw);
  if (!parsed.success) return [];
  const wanted = new Set(photoIds);
  const seen = new Set<string>();
  return parsed.data.flatMap(({ photoId, caption }) => {
    if (!wanted.has(photoId) || seen.has(photoId)) return [];
    const text = [
      ...caption
        .replace(/[\u0000-\u001f\u007f]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    ]
      .slice(0, CAPTION_MAX)
      .join('')
      .trim();
    if (!text) return [];
    seen.add(photoId);
    return [{ photoId, caption: text }];
  });
}

type Deps = { fetch: typeof fetch; apiKey: string | undefined; timeoutMs?: number };

export async function writeCaptions(
  items: CaptionItem[],
  { fetch, apiKey, timeoutMs = TIMEOUT_MS }: Deps,
): Promise<Caption[]> {
  if (!apiKey || items.length === 0) return [];
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: CAPTION_MODEL,
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: 'user', content: captionPrompt(items) }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return [];
    const body = z
      .object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })) })
      .safeParse(await response.json());
    if (!body.success) return [];
    const reply = body.data.content.map((block) => block.text ?? '').join('');
    return parseCaptions(
      reply,
      items.map((item) => item.photoId),
    );
  } catch {
    return [];
  }
}
