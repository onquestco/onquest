import 'server-only';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GuideCard } from '@/lib/social/schema';
import { toGuide, type Guide } from './guideSchema';

// Guides are Markdown files in content/guides/ (spec C §3.6): publishing one is a pull request.
// Read once per server instance; next.config.ts traces the folder into the deployment.

const GUIDES_DIR = join(process.cwd(), 'content', 'guides');
let loaded: Guide[] | undefined;

export function allGuides(): Guide[] {
  loaded ??= readdirSync(GUIDES_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const guide = toGuide(readFileSync(join(GUIDES_DIR, file), 'utf8'));
      if (`${guide.slug}.md` !== file) throw new Error(`Guide ${file} has slug ${guide.slug}`);
      return guide;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return loaded;
}

/** Live guides: drafts are shown only outside production (previews, local). */
export function publishedGuides(): Guide[] {
  const production = process.env.VERCEL_ENV === 'production';
  return allGuides().filter((guide) => !guide.draft || !production);
}

export function getGuide(slug: string): Guide | undefined {
  return publishedGuides().find((guide) => guide.slug === slug);
}

export function toGuideCard(guide: Guide): GuideCard {
  const { slug, title, summary, image, imageAlt, minutes } = guide;
  return { slug, title, summary, image, imageAlt, minutes };
}
