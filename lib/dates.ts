const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const short = (month: number) => MONTHS[month]!.slice(0, 3);

function parse(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year: year!, month: month! - 1, day: day! };
}

/**
 * Human date range for a trip, e.g.
 *   12 February · 12 – 16 February · 28 Feb – 3 Mar · 28 Dec 2025 – 2 Jan 2026
 * The year is only shown when the trip crosses a year.
 */
export function formatDateRange(startIso: string, endIso?: string): string {
  const start = parse(startIso);
  const end = parse(endIso ?? startIso);

  if (start.year !== end.year) {
    return `${start.day} ${short(start.month)} ${start.year} – ${end.day} ${short(end.month)} ${end.year}`;
  }
  if (start.month !== end.month) {
    return `${start.day} ${short(start.month)} – ${end.day} ${short(end.month)}`;
  }
  if (start.day !== end.day) {
    return `${start.day} – ${end.day} ${MONTHS[start.month]}`;
  }
  return `${start.day} ${MONTHS[start.month]}`;
}

/** Inclusive number of days between two ISO dates. */
export function countDays(startIso: string, endIso: string): number {
  const ms = Date.parse(`${endIso}T00:00:00Z`) - Date.parse(`${startIso}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}
