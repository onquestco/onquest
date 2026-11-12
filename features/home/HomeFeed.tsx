'use client';

import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { FeedPageSchema, type FeedPage } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';
import { FeedCard } from './FeedCard';

type Props = { first: FeedPage | null; suggested: QuestCard[] };

/** The feed (M21): Quests from people you follow, best first, 10 at a time; then suggestions. */
export function HomeFeed({ first, suggested }: Props) {
  const [items, setItems] = useState(first?.items ?? []);
  const [nextOffset, setNextOffset] = useState(first?.nextOffset ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(first === null);

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
        ...page.items.filter((item) => !list.some((seen) => seen.key === item.key)),
      ]);
      setNextOffset(page.nextOffset);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="flex flex-col gap-4" aria-label="From people you follow">
        <h2 className="text-lead font-semibold text-ink">From people you follow</h2>
        {items.length === 0 && !failed && (
          <p className="text-body text-ink-muted">Follow travellers to see their Quests here.</p>
        )}
        {items.map((item) => (
          <FeedCard key={item.key} quest={item} />
        ))}
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
      {suggested.length > 0 && (
        <section className="flex flex-col gap-4" aria-label="Suggested for you">
          <h2 className="text-lead font-semibold text-ink">Suggested for you</h2>
          {suggested.map((quest) => (
            <FeedCard key={quest.key} quest={quest} />
          ))}
        </section>
      )}
    </>
  );
}
