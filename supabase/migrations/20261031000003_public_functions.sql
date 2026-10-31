-- The only way anonymous visitors read data. Each function returns exactly what one page needs.

-- Trip page. Null for drafts, private trips, or a wrong handle/slug.
create function public.get_trip(p_handle text, p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'trip', to_jsonb(t) - 'owner_id',
    'owner', jsonb_build_object('handle', p.handle, 'name', p.name, 'avatar_url', p.avatar_url),
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ph.id, 'width', ph.width, 'height', ph.height, 'caption', ph.caption) order by ph.sort)
      from public.photos ph where ph.trip_id = t.id), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pl.id, 'name', pl.name, 'lat', pl.lat, 'lng', pl.lng,
        'note', pl.note, 'photo_id', pl.photo_id) order by pl.sort)
      from public.places pl where pl.trip_id = t.id), '[]'::jsonb)
  )
  from public.trips t
  join public.profiles p on p.id = t.owner_id
  where p.handle = lower(p_handle)
    and t.slug = lower(p_slug)
    and t.status = 'published'
    and t.visibility in ('public', 'unlisted');
$$;

-- Profile page. Only public trips appear anywhere on a profile.
create function public.get_profile(p_handle text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with p as (
    select * from public.profiles where handle = lower(p_handle)
  ),
  t as (
    select tr.* from public.trips tr join p on tr.owner_id = p.id
    where tr.status = 'published' and tr.visibility = 'public'
  ),
  pl as (
    select pl.*, t.slug as trip_slug from public.places pl join t on t.id = pl.trip_id
  )
  select jsonb_build_object(
    'profile', (select jsonb_build_object(
      'handle', handle, 'name', name, 'bio', bio, 'home_city', home_city, 'avatar_url', avatar_url) from p),
    'stats', jsonb_build_object(
      'trips',     (select count(*) from t),
      'places',    (select count(distinct coalesce(geo_ref, lower(name))) from pl),
      'countries', (select count(distinct country_code) from pl),
      'days',      (select coalesce(sum(end_date - start_date + 1), 0) from t where start_date is not null and end_date is not null)
    ),
    'trips', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'slug', slug, 'title', title, 'short_title', short_title, 'template_id', template_id,
        'start_date', start_date, 'end_date', end_date, 'cover_photo_id', cover_photo_id)
        order by published_at desc)
      from t), '[]'::jsonb),
    'pins', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'lat', lat, 'lng', lng, 'trip_slug', trip_slug))
      from pl), '[]'::jsonb)
  )
  where exists (select 1 from p);
$$;

-- Sitemap. Public trips with enough words to be worth indexing (docs/03 §C.1).
create function public.list_sitemap_trips()
returns table (handle text, slug text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.handle, t.slug, t.updated_at
  from public.trips t
  join public.profiles p on p.id = t.owner_id
  where t.status = 'published' and t.visibility = 'public' and t.word_count >= 80
  order by t.updated_at desc;
$$;

revoke execute on function public.get_trip(text, text), public.get_profile(text), public.list_sitemap_trips() from public;
grant execute on function public.get_trip(text, text), public.get_profile(text), public.list_sitemap_trips() to anon, authenticated;
