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

insert into public.profiles (key, handle, name, bio, home_city)
values ('00000000-0000-4000-8000-000000000001', 'alex', 'Alex Morgan', 'Made of memories, miles, and moments', 'Bengaluru');
-- Every live handle has a claim (migration 8), so nobody else can take it.
insert into public.handle_claims (handle, profile_key, saved_at, saved_by, save_reason)
values ('alex', '00000000-0000-4000-8000-000000000001', now(), '00000000-0000-4000-8000-000000000001', 'create');

-- Trips are documents (migration 9): photos and places live on the row. Every trip has a draft.
insert into public.trips (key, owner_key, slug, template_id, visibility, status, title, short_title,
  start_date, end_date, cover_photo_key, seed, content, word_count, published_at, photos, places,
  comments_on, search_text, published_draft_saved_at, started_at, saved_at, saved_by, save_reason)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'goa-2026', 'beach',
   'public', 'published', 'Salt in the Air, Sand in My Hair', 'My Goa Trip', '2026-02-12', '2026-02-16',
   null, 1234567, '{"destination": "Goa", "favourites": [], "days": []}', 120, now(), '[]',
   '[{"id": "00000000-0000-4000-8000-0000000000b1", "name": "Fontainhas", "lat": 15.496, "lng": 73.833,
      "city": "Panjim", "countryCode": "IN", "note": "Every wall a different colour."},
     {"id": "00000000-0000-4000-8000-0000000000b2", "name": "Palolem Beach", "lat": 15.01, "lng": 74.023,
      "city": "Canacona", "countryCode": "IN", "note": "A sunrise worth the alarm."}]',
   true, 'salt in the air, sand in my hair goa fontainhas palolem beach', null, null, now(),
   '00000000-0000-4000-8000-000000000001', 'publish'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'gokarna-k3f9x2', 'beach',
   'unlisted', 'published', 'Quiet Coast', 'Gokarna', '2026-03-01', '2026-03-03',
   null, 7654321, '{"destination": "Gokarna", "favourites": [], "days": []}', 20, now(), '[]',
   '[{"id": "00000000-0000-4000-8000-0000000000b3", "name": "Om Beach", "lat": 14.519, "lng": 74.32,
      "city": "Gokarna", "countryCode": "IN"}]',
   true, 'quiet coast gokarna om beach', null, null, now(), '00000000-0000-4000-8000-000000000001', 'publish'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000001', 'secret-trip', 'beach',
   'private', 'published', 'Just for me', 'Secret', null, null,
   null, 1111111, '{"favourites": [], "days": []}', 0, now(), '[]', '[]',
   true, 'just for me', null, null, now(), '00000000-0000-4000-8000-000000000001', 'publish');

insert into public.trip_drafts (key, owner_key, template_id, title, short_title, start_date, end_date,
  cover_photo_key, content, photos, places, started_at, saved_at, saved_by, save_reason)
select key, owner_key, template_id, title, short_title, start_date, end_date, cover_photo_key,
  content, photos, places, started_at, saved_at, saved_by, 'create'
from public.trips;
