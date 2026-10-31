const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "5 days · 7 places". Parts with a zero count are left out. */
export function formatStats({ days, places }: { days: number; places: number }): string {
  const parts = [];
  if (days > 0) parts.push(plural(days, 'day'));
  if (places > 0) parts.push(plural(places, 'place'));
  return parts.join(' · ');
}
