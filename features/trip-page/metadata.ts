import type { Metadata } from 'next';
import type { TripData } from '@/lib/trip/types';
import { SITE_NAME } from '@/lib/site';

const MIN_WORDS_TO_INDEX = 80; // thinner pages are noindex (docs/03 §C.1)

const trim = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

export function countWords(trip: TripData): number {
  const texts = [
    trip.title,
    trip.note,
    ...trip.days.flatMap((day) => [day.title, day.quote, day.story]),
    ...trip.places.map((place) => place.note),
  ];
  return texts.join(' ').split(/\s+/).filter(Boolean).length;
}

function description(trip: TripData): string {
  const fallback = [
    trip.days.length > 0 && `${trip.days.length} days`,
    trip.destination && `in ${trip.destination}`,
  ]
    .filter(Boolean)
    .join(' ');
  const places = trip.places.map((place) => place.name).join(', ');
  const text = trip.note ?? trip.days[0]?.story ?? [fallback, places].filter(Boolean).join(': ');
  return trim(text, 155);
}

type Options = {
  /** Unlisted trips are never indexed. */
  unlisted?: boolean;
};

export function tripMetadata(trip: TripData, { unlisted = false }: Options = {}): Metadata {
  const title = trim(`${trip.title}: ${trip.shortTitle} by ${trip.traveler.name}`, 60);
  const index = !unlisted && countWords(trip) >= MIN_WORDS_TO_INDEX;

  return {
    title: `${title} | ${SITE_NAME}`,
    description: description(trip),
    alternates: { canonical: trip.url },
    robots: index ? { index: true, follow: true } : { index: false, follow: !unlisted },
    authors: [{ name: trip.traveler.name, url: trip.traveler.profileUrl }],
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      title: trip.title,
      description: [trip.shortTitle, trip.dateLabel].filter(Boolean).join(' · '),
      url: trip.url,
      publishedTime: trip.publishedAt,
      modifiedTime: trip.updatedAt,
      authors: trip.traveler.profileUrl ? [trip.traveler.profileUrl] : undefined,
    },
    twitter: { card: 'summary_large_image', title: trip.title },
  };
}
