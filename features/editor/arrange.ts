import { MAX_PAGES, PHOTOS_PER_PAGE } from '@/lib/trip/limits';
import { tripDateKey } from './groupDays';
import { pageDates, pageTitle } from './pageTitle';

// Turns picked photos into up to 5 pages of 3 (spec A §3.3, rules 1–5). Pure: no network.
// Founder decisions F-A1 (3 per page) and F-A10 (where undated photos go) live only in here.

export type ArrangePhoto = {
  id: string;
  /** ISO time from EXIF, if the photo has one. */
  takenAt?: string;
  placeName?: string;
};

export type ArrangedPage = {
  photoIds: string[];
  title: string;
  startDate?: string;
  endDate?: string;
};

export type Arrangement = {
  pages: ArrangedPage[];
  /** Each dated photo's trip day, "YYYY-MM-DD". */
  dateById: Map<string, string>;
  /** Some photos had no date, so pick order was used for them. */
  fallbackUsed: boolean;
};

const chunk = <T>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / PHOTOS_PER_PAGE) }, (_, i) =>
    items.slice(i * PHOTOS_PER_PAGE, (i + 1) * PHOTOS_PER_PAGE),
  );

const hourOf = (takenAt: string) => new Date(takenAt).getHours();
const partOfDay = (hour: number) => (hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening');

export function arrangePages(photos: ArrangePhoto[]): Arrangement {
  const dated = photos
    .filter((photo): photo is ArrangePhoto & { takenAt: string } => Boolean(photo.takenAt))
    .sort((first, second) => Date.parse(first.takenAt) - Date.parse(second.takenAt));
  const undated = photos.filter((photo) => !photo.takenAt);
  const dateById = new Map(dated.map((photo) => [photo.id, tripDateKey(photo.takenAt)]));
  const days = [...new Set(dated.map((photo) => dateById.get(photo.id) as string))]; // every dated photo has a key

  // Rule 2 or 3: dated photos into pages.
  let groups: (ArrangePhoto & { takenAt: string })[][];
  const oneBusyDay = days.length === 1 && dated.length > PHOTOS_PER_PAGE;
  if (oneBusyDay || days.length === 0) {
    groups = chunk(dated);
  } else {
    const byDay = days.flatMap((day) => chunk(dated.filter((photo) => dateById.get(photo.id) === day)));
    const undatedPages = Math.ceil(undated.length / PHOTOS_PER_PAGE);
    groups = byDay.length + undatedPages > MAX_PAGES ? chunk(dated) : byDay;
  }

  // Rule 4: undated photos fill the last page's free slots, then new pages, in pick order.
  const pages: ArrangePhoto[][] = groups.map((group) => [...group]);
  const rest = [...undated];
  const last = pages.at(-1);
  if (last) last.push(...rest.splice(0, PHOTOS_PER_PAGE - last.length));
  pages.push(...chunk(rest));

  // Rule 2's titles: by time of day, only when every page gets a different one.
  const timeTitles = oneBusyDay
    ? groups.map((group) => partOfDay(hourOf((group[0] as { takenAt: string }).takenAt)))
    : [];
  const useTimeTitles = timeTitles.length === pages.length && new Set(timeTitles).size === timeTitles.length;

  const firstTripDay = days[0];
  const arranged = pages.map((page, index) => {
    const info = page.map((photo) => ({ date: dateById.get(photo.id), placeName: photo.placeName }));
    return {
      photoIds: page.map((photo) => photo.id),
      title: useTimeTitles
        ? (timeTitles[index] as string) // same length as pages when useTimeTitles
        : oneBusyDay
          ? `Page ${index + 1}`
          : pageTitle(info, index + 1, firstTripDay),
      ...pageDates(info),
    };
  });

  return { pages: arranged, dateById, fallbackUsed: undated.length > 0 };
}
