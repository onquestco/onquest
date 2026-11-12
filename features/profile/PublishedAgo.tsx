'use client';

import { useSyncExternalStore } from 'react';

const DAY = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'} ago`;

/** "Today", "Yesterday", "5 days ago", "3 weeks ago", "2 months ago", "1 year ago". */
export function publishedAgo(iso: string, now: number): string {
  const days = Math.floor((now - Date.parse(iso)) / DAY);
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 14) return plural(days, 'day');
  if (days < 60) return plural(Math.floor(days / 7), 'week');
  if (days < 365) return plural(Math.floor(days / 30), 'month');
  return plural(Math.floor(days / 365), 'year');
}

const noSubscribe = () => () => undefined;

/**
 * When a Quest was published, on profile tiles (the prototype's "5 days ago"). The profile page is
 * cached, so the server prints the month and the browser swaps in the relative time.
 */
export function PublishedAgo({ iso }: { iso: string }) {
  const now = useSyncExternalStore(
    noSubscribe,
    () => Math.floor(Date.now() / DAY) * DAY,
    () => 0,
  );
  if (!now) return <>{`${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`}</>;
  return <>{publishedAgo(iso, now)}</>;
}
