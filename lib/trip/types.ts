// What templates render. Built by toTripData() (or the demo fixture), never by templates themselves.
// Every required field is always filled in, so templates don't need fallbacks for them.

export type Photo = {
  id: string;
  thumb: string; // ~400 px
  display: string; // ~1600 px
  width: number;
  height: number;
  caption?: string;
};

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  note?: string;
  photo?: Photo;
};

export type Day = {
  number: number; // 1-based
  title: string;
  dateLabel?: string; // "Sat 17 Oct" or "12 – 14 February", from the page's own dates
  quote?: string;
  story?: string;
  places: Place[];
  photos: Photo[];
};

export type TripData = {
  /** The Quest's permanent key. */
  key: string;
  /** Same as `key`, kept for existing templates. */
  id: string;
  templateId: string;
  url: string; // absolute, canonical
  seed: number;
  traveler: { name: string; handle: string; avatar?: Photo; profileUrl?: string };
  title: string;
  shortTitle: string;
  destination?: string; // "Goa"
  country?: string; // "India"
  dateLabel?: string; // "12 – 16 February"
  startDate?: string; // ISO date
  endDate?: string;
  statsLabel: string; // "5 days · 7 places"
  cover?: Photo;
  photos: Photo[];
  places: Place[];
  favourites: Place[];
  days: Day[];
  note?: string;
  closingHeadline: string;
  publishedAt?: string;
  updatedAt?: string;
};
