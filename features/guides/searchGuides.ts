import type { Guide } from './guideSchema';

const MAX_RESULTS = 5;

/** Stories in search (spec C §3.5): title, places and tags contain the words typed. Drafts never. */
export function searchGuides(guides: Guide[], text: string): Guide[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return guides
    .filter((guide) => !guide.draft)
    .filter((guide) => {
      const haystack = [guide.title, ...guide.places, ...guide.tags].join(' ').toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .slice(0, MAX_RESULTS);
}
