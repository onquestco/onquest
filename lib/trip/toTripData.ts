import { countDays, formatDateRange } from '@/lib/dates';
import { absoluteUrl } from '@/lib/site';
import { photoUrls } from '@/lib/storage';
import type { QuestDocument, TripRows, Visibility } from './schema';
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
      dateLabel: day.startDate ? formatDateRange(day.startDate, day.endDate) : undefined,
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
    key: trip.key ?? trip.id,
    id: trip.key ?? trip.id,
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

type DraftForPreview = {
  key: string;
  /** The Quest's link once published; drafts preview under a placeholder. */
  slug?: string;
  photoFolder: string;
  visibility: Visibility;
  savedAt: string;
  document: QuestDocument;
};

type Owner = TripRows['owner'];

/**
 * A draft as the viewer will see it once published. Goes through toTripData so the preview can't
 * drift from the real Quest page (M7). Owner-only fields (takenAt, date) never reach TripData.
 */
export function draftToTripData(
  draft: DraftForPreview,
  owner: Owner,
  seed: number,
  defaults: Defaults,
): TripData {
  const { document } = draft;
  const rows: TripRows = {
    trip: {
      id: draft.key,
      key: draft.key,
      slug: draft.slug ?? 'preview',
      template_id: document.templateId,
      visibility: draft.visibility,
      title: document.title ?? null,
      short_title: document.shortTitle ?? null,
      start_date: document.startDate ?? null,
      end_date: document.endDate ?? null,
      cover_photo_id: document.coverPhotoId ?? null,
      seed,
      content: document.content,
      published_at: null,
      updated_at: draft.savedAt,
      saved_at: draft.savedAt,
    },
    owner,
    photo_folder: draft.photoFolder,
    photos: document.photos.map(({ id, width, height, caption }) => ({
      id,
      width,
      height,
      caption: caption ?? null,
    })),
    places: document.places.map(({ id, name, lat, lng, note, photoId }) => ({
      id,
      name,
      lat,
      lng,
      note: note ?? null,
      photo_id: photoId ?? null,
    })),
  };
  return toTripData(rows, defaults);
}
