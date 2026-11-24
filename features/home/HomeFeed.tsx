'use client';

import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { FeedPageSchema, type FeedPage } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';
import { FeedCard } from './FeedCard';
import { questFeedItems } from './feedItems';

type Props = { signedIn: boolean; first: FeedPage | null; suggested: QuestCard[] };

/**
 * The feed (M21): Quests from people you follow, best first, 10 at a time; then suggestions.
 * Signed out (OQ-16) there's no one followed, so it's suggestions only, as "Popular on OnQuest".
 */
export function HomeFeed({ signedIn, first, suggested }: Props) {
  // Blog items are skipped until BL-05 renders them (questFeedItems).
  const [items, setItems] = useState(questFeedItems(first?.items ?? []));
  const [nextOffset, setNextOffset] = useState(first?.nextOffset ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(signedIn && first === null);

  async function loadMore() {
    if (nextOffset === null || !first) return;
    setLoading(true);
    setFailed(false);
    try {
      const query = new URLSearchParams({ offset: String(nextOffset), now: first.now });
      const response = await fetch(`/api/feed?${query.toString()}`, { cache: 'no-store' });
      const page = FeedPageSchema.parse(await response.json());
      setItems((list) => [
        ...list,
        ...questFeedItems(page.items).filter((item) => !list.some((seen) => seen.key === item.key)),
      ]);
      setNextOffset(page.nextOffset);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const suggestedTitle = signedIn ? 'Suggested for you' : 'Popular on OnQuest';
  return (
    <>
      {signedIn && (
        <section className="flex flex-col gap-4" aria-label="From people you follow">
          <h2 className="text-lead font-semibold text-ink">From people you follow</h2>
          {items.length === 0 && !failed && (
            <p className="text-body text-ink-muted">Follow travellers to see their Quests here.</p>
          )}
          {/* Two columns on a desktop (OQ-5); one on phones. */}
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <FeedCard key={item.key} quest={item} />
            ))}
          </div>
          {failed && (
            <p role="alert" className="text-body text-ink-muted">
              Couldn&apos;t load the feed. Try again in a moment.
            </p>
          )}
          {nextOffset !== null && (
            <Button variant="secondary" block disabled={loading} onClick={() => void loadMore()}>
              {loading ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </section>
      )}
      {suggested.length > 0 && (
        <section className="flex flex-col gap-4" aria-label={suggestedTitle}>
          <h2 className="text-lead font-semibold text-ink">{suggestedTitle}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {suggested.map((quest) => (
              <FeedCard key={quest.key} quest={quest} signedIn={signedIn} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
