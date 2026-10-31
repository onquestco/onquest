import { countDays, formatDateRange } from '@/lib/dates';
import { absoluteUrl } from '@/lib/site';
import { photoUrls } from '@/lib/storage';
import type { TripRows } from './schema';
import { formatStats } from './stats';
import type { Day, Photo, Place, TripData } from './types';

type Defaults = { title: string; closingHeadline: string };

const isPresent = <T>(value: T | undefined): value is T => value !== undefined;

/** Turns database rows into what templates render. The only place defaults are applied. */
export function toTripData(rows: TripRows, defaults: Defaults): TripData {
  const { trip, owner } = rows;
  const { content } = trip;

  const photos: Photo[] = rows.photos.map((photo) => ({
    id: photo.id,
    ...photoUrls(rows.photo_folder, photo.id),
    width: photo.width,
    height: photo.height,
    caption: photo.caption ?? undefined,
  }));
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));

  const places: Place[] = rows.places.map((place) => ({
    id: place.id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    note: place.note ?? undefined,
    photo: place.photo_id ? photoById.get(place.photo_id) : undefined,
  }));
  const placeById = new Map(places.map((place) => [place.id, place]));

  const days: Day[] = content.days.map((day, index) => {
    const dayPlaces = day.placeIds.map((id) => placeById.get(id)).filter(isPresent);
    return {
      number: index + 1,
      title: day.title || dayPlaces[0]?.name || `Day ${index + 1}`,
      quote: day.quote || undefined,
      story: day.story || undefined,
      places: dayPlaces,
      // A photo removed after this was saved just drops out.
      photos: day.photoIds.map((id) => photoById.get(id)).filter(isPresent),
    };
  });

  const { start_date: startDate, end_date: endDate } = trip;
  const dayCount = days.length || (startDate && endDate ? countDays(startDate, endDate) : 0);

  return {
    id: trip.id,
    templateId: trip.template_id,
    url: absoluteUrl(`/@${owner.handle}/${trip.slug}`),
    seed: trip.seed,
    traveler: {
      name: owner.name || owner.handle,
      handle: owner.handle,
      avatar: owner.avatar_url
        ? { id: 'avatar', thumb: owner.avatar_url, display: owner.avatar_url, width: 400, height: 400 }
        : undefined,
      profileUrl: absoluteUrl(`/@${owner.handle}`),
    },
    title: trip.title || defaults.title,
    shortTitle: trip.short_title || (content.destination ? `My ${content.destination} Trip` : 'My Trip'),
    destination: content.destination || undefined,
    dateLabel: startDate ? formatDateRange(startDate, endDate ?? undefined) : undefined,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    statsLabel: formatStats({ days: dayCount, places: places.length }),
    cover: (trip.cover_photo_id ? photoById.get(trip.cover_photo_id) : undefined) ?? photos[0],
    photos,
    places,
    favourites: content.favourites.map((id) => placeById.get(id)).filter(isPresent),
    days,
    note: content.note || undefined,
    closingHeadline: content.closingHeadline || defaults.closingHeadline,
    publishedAt: trip.published_at ?? undefined,
    updatedAt: trip.updated_at,
  };
}
