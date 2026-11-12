-- 14: get_profile's trips also return published_at, so profile tiles can say "5 days ago" like the
-- prototype (founder, 12 Nov). Additive: no argument or field changes, old code ignores the new field.

create or replace function public.get_profile(p_handle text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with p as (
    select * from public.profiles where handle = lower(p_handle)
  ),
  t as (
    select tr.* from public.trips tr join p on tr.owner_key = p.key
    where tr.status = 'published' and tr.visibility = 'public'
  ),
  pl as (
    select place ->> 'name' as name, (place ->> 'lat')::double precision as lat,
      (place ->> 'lng')::double precision as lng, place ->> 'geoRef' as geo_ref,
      place ->> 'countryCode' as country_code, t.slug as trip_slug, t.published_at, position
    from t, jsonb_array_elements(t.places) with ordinality as list (place, position)
  ),
  shown as (
    select pl.* from pl, p where coalesce((p.settings ->> 'showPlaces')::boolean, true)
  )
  select jsonb_build_object(
    'profile', (select jsonb_build_object(
      'key', key, 'handle', handle, 'name', name, 'bio', bio, 'home_city', home_city,
      'avatar_url', avatar_url) from p),
    'stats', jsonb_build_object(
      'trips',     (select count(*) from t),
      'places',    (select count(distinct coalesce(geo_ref, lower(name))) from pl),
      'countries', (select count(distinct country_code) from pl),
      'days',      (select coalesce(sum(end_date - start_date + 1), 0) from t where start_date is not null and end_date is not null),
      'followers', (select count(*) from public.follows f, p where f.followee_key = p.key),
      'following', (select count(*) from public.follows f, p where f.follower_key = p.key)
    ),
    'trips', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', key, 'key', key, 'slug', slug, 'title', title, 'short_title', short_title,
        'template_id', template_id, 'start_date', start_date, 'end_date', end_date,
        'cover_photo_id', cover_photo_key, 'photo_folder', owner_key::text || '/' || key::text,
        'page_count', jsonb_array_length(content -> 'days'), 'photo_count', jsonb_array_length(photos),
        'published_at', published_at)
        order by published_at desc)
      from t), '[]'::jsonb),
    'pins', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'lat', lat, 'lng', lng, 'trip_slug', trip_slug)
        order by published_at desc, position)
      from shown), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(name order by first) from (
        select name, min(published_at::text || lpad(position::text, 6, '0')) as first
        from shown group by name) named), '[]'::jsonb)
  )
  where exists (select 1 from p);
$$;
