import { z } from 'zod';

// A guide's front matter (spec C §3.6). Checked when guides are loaded, so a broken file fails
// the build instead of a page.

export const GuideFrontMatterSchema = z.object({
  title: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  summary: z.string().min(1).max(200),
  /** Under public/, e.g. "/guides/goa-in-3-days.jpg". */
  image: z.string().regex(/^\/guides\/[a-z0-9-]+\.(jpg|jpeg|png|webp|svg)$/),
  imageAlt: z.string().min(1).max(150),
  minutes: z.number().int().min(1).max(60),
  author: z.literal('the OnQuest team'),
  publishedAt: z.iso.date(),
  places: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  questKeys: z.array(z.uuid()).max(20).default([]),
  /** Placeholder copy until the founders' guides land: noindex, out of the sitemap and search. */
  draft: z.boolean().default(false),
});

export type GuideFrontMatter = z.infer<typeof GuideFrontMatterSchema>;
export type Guide = GuideFrontMatter & { body: string };

/**
 * Splits "---\nkey: value\n---\nbody". Values: a JSON string, number, boolean or array
 * (["Goa", "Panjim"]), or bare text. Enough for guides; nothing else is parsed as YAML.
 */
export function parseGuideFile(text: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error('Guide is missing its --- front matter ---');
  const data: Record<string, unknown> = {};
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon < 1) throw new Error(`Guide front matter line has no key: ${line}`);
    const key = line.slice(0, colon).trim();
    const raw = line.slice(colon + 1).trim();
    const json = /^["[]/.test(raw) || /^(-?\d+(\.\d+)?|true|false)$/.test(raw);
    data[key] = json ? JSON.parse(raw) : raw;
  }
  return { data, body: (match[2] ?? '').trim() };
}

export function toGuide(text: string): Guide {
  const { data, body } = parseGuideFile(text);
  return { ...GuideFrontMatterSchema.parse(data), body };
}
