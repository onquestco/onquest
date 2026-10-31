-- Public photo URLs contain the owner's folder ({owner_id}/{trip_id}), so the trip page needs it
-- to build image links. It's returned only as a storage path, and trip.owner_id stays hidden.
create or replace function public.get_trip(p_handle text, p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'trip', to_jsonb(t) - 'owner_id',
    'owner', jsonb_build_object('handle', p.handle, 'name', p.name, 'avatar_url', p.avatar_url),
    'photo_folder', t.owner_id::text || '/' || t.id::text,
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
