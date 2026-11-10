import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Explore | ${SITE_NAME}`, robots: { index: false } };

// Search, trending Quests and guides land with C-06/C-07. Until then the tab says so plainly.
export default function ExplorePage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
      <h1 className="text-title text-ink">Explore</h1>
      <p className="text-body text-ink-muted">Search, trending Quests and travel guides are coming soon.</p>
    </main>
  );
}
