import type { TripData } from '@/lib/trip/types';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const isAbsoluteHttpUrl = (url: string) => /^https?:\/\//.test(url);

/** schema.org description of a trip page (BlogPosting about a Trip). See docs/03 §C.3. */
export function tripJsonLd(trip: TripData) {
  const author = {
    '@type': 'Person',
    name: trip.traveler.name,
    ...(trip.traveler.profileUrl ? { url: trip.traveler.profileUrl } : {}),
  };
  const images = [trip.cover?.display, ...trip.photos.slice(0, 3).map((photo) => photo.display)].filter(
    (url): url is string => !!url && isAbsoluteHttpUrl(url),
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: trip.title,
    alternativeHeadline: trip.shortTitle,
    url: trip.url,
    ...(trip.publishedAt ? { datePublished: trip.publishedAt } : {}),
    ...(trip.updatedAt ? { dateModified: trip.updatedAt } : {}),
    author,
    ...(images.length > 0 ? { image: [...new Set(images)] } : {}),
    ...(trip.destination
      ? {
          contentLocation: {
            '@type': 'Place',
            name: [trip.destination, trip.country].filter(Boolean).join(', '),
          },
        }
      : {}),
    about: {
      '@type': 'Trip',
      name: trip.shortTitle,
      itinerary: {
        '@type': 'ItemList',
        itemListElement: trip.places.map((place, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'TouristAttraction',
            name: place.name,
            geo: { '@type': 'GeoCoordinates', latitude: place.lat, longitude: place.lng },
          },
        })),
      },
    },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
}

/**
 * JSON for a <script type="application/ld+json"> tag. "<" is escaped so user text
 * like "</script>" can never break out of the tag.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
