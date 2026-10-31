-- Local development data (supabase db reset). Never run against production.
-- Demo user "alex" with one public, one unlisted and one private trip, for trying the
-- public pages and access rules. The visual demo at /demo uses lib/demo/goaTrip.ts instead.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  '00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'alex@example.com', '', now(),
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now()
);

insert into public.profiles (id, handle, name, bio, home_city)
values ('00000000-0000-4000-8000-000000000001', 'alex', 'Alex Morgan', 'Made of memories, miles, and moments', 'Bengaluru');

insert into public.trips (id, owner_id, slug, template_id, visibility, status, title, short_title,
  start_date, end_date, content, word_count, published_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'goa-2026', 'beach',
   'public', 'published', 'Salt in the Air, Sand in My Hair', 'My Goa Trip', '2026-02-12', '2026-02-16',
   '{"destination": "Goa", "favourites": [], "days": []}', 120, now()),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'gokarna-k3f9x2', 'beach',
   'unlisted', 'published', 'Quiet Coast', 'Gokarna', '2026-03-01', '2026-03-03',
   '{"destination": "Gokarna", "favourites": [], "days": []}', 20, now()),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000001', 'secret-trip', 'beach',
   'private', 'published', 'Just for me', 'Secret', null, null,
   '{"favourites": [], "days": []}', 0, now());

insert into public.places (trip_id, name, lat, lng, city, country_code, note, sort) values
  ('00000000-0000-4000-8000-0000000000a1', 'Fontainhas', 15.496, 73.833, 'Panjim', 'IN', 'Every wall a different colour.', 0),
  ('00000000-0000-4000-8000-0000000000a1', 'Palolem Beach', 15.01, 74.023, 'Canacona', 'IN', 'A sunrise worth the alarm.', 1),
  ('00000000-0000-4000-8000-0000000000a2', 'Om Beach', 14.519, 74.32, 'Gokarna', 'IN', null, 0);
