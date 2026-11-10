import { daysBetween } from './groupDays';

// Page and Quest titles made from dates and places (spec A §3.3, rules 5–6). Run again after every
// edit for pages whose title the traveller hasn't changed.

const TITLE_MAX = 40; // DaySchema limit

type PagePhoto = { date?: string; placeName?: string };

function mostCommon(names: (string | undefined)[]): string | undefined {
  const counts = new Map<string, number>();
  for (const name of names) if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  let best: string | undefined;
  for (const [name, count] of counts) if (!best || count > (counts.get(best) ?? 0)) best = name;
  return best;
}

const trim = (text: string) => (text.length <= TITLE_MAX ? text : `${text.slice(0, TITLE_MAX - 1).trimEnd()}…`);

/** "Day 2 · Panjim", "Days 4–6 · Gokarna", or "Page 3" when the page has no dates. */
export function pageTitle(photos: PagePhoto[], pageNumber: number, firstTripDay: string | undefined): string {
  const dates = photos.flatMap((photo) => (photo.date ? [photo.date] : [])).sort();
  const first = dates[0];
  const last = dates.at(-1);
  if (!first || !last || !firstTripDay) return `Page ${pageNumber}`;

  const from = daysBetween(firstTripDay, first) + 1;
  const to = daysBetween(firstTripDay, last) + 1;
  const days = from === to ? `Day ${from}` : `Days ${from}–${to}`;
  const place = mostCommon(photos.map((photo) => photo.placeName));
  return trim(place ? `${days} · ${place}` : days);
}

/** The page's date range: the earliest and latest photo dates on it. */
export function pageDates(photos: PagePhoto[]): { startDate?: string; endDate?: string } {
  const dates = photos.flatMap((photo) => (photo.date ? [photo.date] : [])).sort();
  return { startDate: dates[0], endDate: dates.at(-1) };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "4 days in Goa", "A day in Panjim", "Panjim", "October 2026", or undefined (template default). */
export function defaultQuestTitle(photos: PagePhoto[]): string | undefined {
  const place = mostCommon(photos.map((photo) => photo.placeName));
  const dates = [...new Set(photos.flatMap((photo) => (photo.date ? [photo.date] : [])))].sort();
  const first = dates[0];
  const last = dates.at(-1);
  const dayCount = first && last ? daysBetween(first, last) + 1 : 0;

  if (place && dayCount > 0) return trim(dayCount === 1 ? `A day in ${place}` : `${dayCount} days in ${place}`);
  if (place) return trim(place);
  if (first) return `${MONTHS[Number(first.slice(5, 7)) - 1]} ${first.slice(0, 4)}`;
  return undefined;
}
