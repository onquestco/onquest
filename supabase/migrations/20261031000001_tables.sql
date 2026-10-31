-- Core tables. See docs/02-lld.md §3.
-- Photo GPS is never stored: only places the traveler confirms are saved.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  handle      text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  name        text check (char_length(name) <= 60),
  bio         text check (char_length(bio) <= 160),
  home_city   text check (char_length(home_city) <= 60),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table public.trips (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  slug           text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  template_id    text not null,
  visibility     text not null default 'unlisted' check (visibility in ('public', 'unlisted', 'private')),
  status         text not null default 'draft' check (status in ('draft', 'published')),
  title          text check (char_length(title) <= 60),
  short_title    text check (char_length(short_title) <= 30),
  start_date     date,
  end_date       date check (end_date is null or start_date is null or end_date >= start_date),
  cover_photo_id uuid,
  seed           int not null default floor(random() * 2147483647)::int,
  content        jsonb not null default '{"favourites": [], "days": []}',
  word_count     int not null default 0,
  published_at   timestamptz,
  updated_at     timestamptz not null default now(),
  unique (owner_id, slug)
);
create index trips_by_owner on public.trips (owner_id, status, visibility, published_at desc);

create table public.photos (
  id         uuid primary key, -- made on the phone; also used in the storage path
  trip_id    uuid not null references public.trips (id) on delete cascade,
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  width      int not null check (width > 0),
  height     int not null check (height > 0),
  taken_at   timestamptz, -- owner-only, never returned by public functions
  caption    text check (char_length(caption) <= 80),
  sort       int not null default 0
);
create index photos_by_trip on public.photos (trip_id, sort);

create table public.places (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips (id) on delete cascade,
  name         text not null check (char_length(name) <= 60),
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  geo_ref      text, -- geocoder place id, for "everyone's trips to Goa" later
  city         text,
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  photo_id     uuid references public.photos (id) on delete set null,
  note         text check (char_length(note) <= 300),
  sort         int not null default 0
);
create index places_by_trip on public.places (trip_id, sort);

alter table public.trips
  add constraint trips_cover_photo_fk foreign key (cover_photo_id) references public.photos (id) on delete set null;

-- Keep trips.updated_at current (used for sitemaps and dateModified).
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trips_touch_updated_at before update on public.trips
  for each row execute function public.touch_updated_at();
