-- 16. Blogs core (docs/specs/blogs.md §3.1–3.3, §3.9, §4.3, §5; task BL-01). Same rules as
-- migrations 9–12: rows never change (decision 0001), every write is one function, foreign keys
-- are deferred, and (since migration 11) nothing is callable until granted at the end.
-- Error codes: OQ401 not signed in, OQ403 no access, OQ404 not found, OQ409 conflict,
-- OQ410 key already used, OQ422 invalid.

-- 1. Tables. No defaults on behaviour columns: the save functions copy every value, and an insert
--    that forgets one must fail.
create table public.blogs (
  key                      uuid        primary key,
  owner_key                uuid        not null,
  slug                     text        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 77),
  status                   text        not null check (status in ('draft', 'published')),
  visibility               text        not null check (visibility in ('public', 'unlisted', 'private')),
  title                    text        check (char_length(title) <= 100),
  body                     text        not null check (char_length(body) <= 10000),
  photos                   jsonb       not null check (
    case when jsonb_typeof(photos) = 'array' then jsonb_array_length(photos) <= 10 else false end),
  place                    jsonb,
  -- No foreign key: a deleted Quest just stops showing on the blog.
  linked_trip_key          uuid,
  comments_on              boolean     not null,
  search_text              text        not null,
  word_count               int         not null,
  published_at             timestamptz,
  published_draft_saved_at timestamptz,
  started_at               timestamptz,
  saved_at                 timestamptz not null,
  saved_by                 uuid,
  save_reason              text        not null check (save_reason in ('create', 'publish', 'visibility', 'comments')),
  unique (owner_key, slug),
  check (status = 'draft' or slug is not null),
  constraint blogs_owner_key_fkey foreign key (owner_key) references public.profiles (key)
    on delete no action deferrable initially deferred
);

-- The working copy, one row per blog key. Autosave archives only these.
create table public.blog_drafts (
  key             uuid        primary key,
  owner_key       uuid        not null,
  title           text        check (char_length(title) <= 100),
  body            text        not null check (char_length(body) <= 10000),
  photos          jsonb       not null check (
    case when jsonb_typeof(photos) = 'array' then jsonb_array_length(photos) <= 10 else false end),
  place           jsonb,
  linked_trip_key uuid,
  started_at      timestamptz,
  saved_at        timestamptz not null,
  saved_by        uuid,
  save_reason     text        not null check (save_reason in ('create', 'save')),
  constraint blog_drafts_key_fkey foreign key (key) references public.blogs (key)
    on delete no action deferrable initially deferred,
  constraint blog_drafts_owner_key_fkey foreign key (owner_key) references public.profiles (key)
    on delete no action deferrable initially deferred
);

-- Archives: the live columns plus archived_at. Many rows per key, old shapes kept: no checks.
create table public.blogs_archive (
  key uuid not null, owner_key uuid not null, slug text, status text not null, visibility text not null,
  title text, body text not null, photos jsonb not null, place jsonb, linked_trip_key uuid,
  comments_on boolean not null, search_text text not null, word_count int not null,
  published_at timestamptz, published_draft_saved_at timestamptz, started_at timestamptz,
  saved_at timestamptz not null, saved_by uuid, save_reason text not null,
  archived_at timestamptz not null,
  primary key (key, saved_at)
);
create table public.blog_drafts_archive (
  key uuid not null, owner_key uuid not null, title text, body text not null, photos jsonb not null,
  place jsonb, linked_trip_key uuid, started_at timestamptz, saved_at timestamptz not null,
  saved_by uuid, save_reason text not null, archived_at timestamptz not null,
  primary key (key, saved_at)
);

-- Insert-only: a deleted blog's URL, so its link says "This blog was removed." and is never reused.
create table public.removed_blog_urls (
  url_hash    text        primary key, -- blog_url_hash(handle, slug)
  blog_key    uuid        not null,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create')
);

-- Who may use a feature before everyone (spec §3.9). user_key null = everyone. Revoking archives.
create table public.feature_access (
  key         uuid        primary key,
  feature     text        not null check (feature in ('blogs')),
  user_key    uuid,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create'),
  unique nulls not distinct (feature, user_key)
);
create table public.feature_access_archive (
  key uuid not null, feature text not null, user_key uuid, saved_at timestamptz not null,
  saved_by uuid, save_reason text not null, archived_at timestamptz not null,
  primary key (key, saved_at)
);

create index blogs_by_owner on public.blogs (owner_key, status, visibility, published_at desc);
create index blogs_public on public.blogs (status, visibility, published_at desc);
-- Trigram search on search_text, skipped where pg_trgm isn't available (PGlite tests), as in
-- migration 9.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_trgm') then
    create schema if not exists extensions;
    create extension if not exists pg_trgm with schema extensions;
    execute 'create index blogs_search_text on public.blogs using gin (search_text extensions.gin_trgm_ops)';
  end if;
end $$;

-- 2. Access. Owners read their own rows; everything else goes through the functions below.
--    No anonymous policy anywhere: public pages read through get_blog and friends.
alter table public.blogs enable row level security;
alter table public.blog_drafts enable row level security;
alter table public.blogs_archive enable row level security;
alter table public.blog_drafts_archive enable row level security;
alter table public.removed_blog_urls enable row level security;
alter table public.feature_access enable row level security;
alter table public.feature_access_archive enable row level security;

create policy "read own blogs" on public.blogs for select to authenticated
  using (owner_key = (select auth.uid()));
create policy "read own blog drafts" on public.blog_drafts for select to authenticated
  using (owner_key = (select auth.uid()));
create policy "read own archived blogs" on public.blogs_archive for select to authenticated
  using (owner_key = (select auth.uid()));
create policy "read own archived blog drafts" on public.blog_drafts_archive for select to authenticated
  using (owner_key = (select auth.uid()));

revoke all on public.blogs, public.blog_drafts, public.blogs_archive, public.blog_drafts_archive,
  public.removed_blog_urls, public.feature_access, public.feature_access_archive
  from anon, authenticated, service_role;
grant select on public.blogs, public.blog_drafts, public.blogs_archive, public.blog_drafts_archive
  to authenticated, service_role;

-- 3. Feature access. Granting and revoking is for the CTO in the SQL editor (service role);
--    docs/runbooks/feature-access.md has the steps and the rollout rule.
create function public.has_feature_access(p_feature text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.feature_access f
    where f.feature = p_feature and (f.user_key = auth.uid() or f.user_key is null));
$$;

-- Handle null = everyone. Granting twice changes nothing.
create function public.grant_feature_access(p_feature text, p_handle text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  if p_feature is null or p_feature not in ('blogs') then
    raise exception 'unknown feature' using errcode = 'OQ422';
  end if;
  if p_handle is not null then
    select p.key into target from public.profiles p where p.handle = lower(trim(p_handle));
    if target is null then
      raise exception 'no such handle' using errcode = 'OQ404';
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('feature/' || p_feature));
  if not exists (select 1 from public.feature_access f
                 where f.feature = p_feature and f.user_key is not distinct from target) then
    insert into public.feature_access (key, feature, user_key, saved_at, saved_by, save_reason)
    values (gen_random_uuid(), p_feature, target, clock_timestamp(), auth.uid(), 'create');
  end if;
end $$;

-- Archives the row (0001 rule 7). Revoking someone who has no row changes nothing. Revoking
-- "everyone" (null) leaves per-person grants in place.
create function public.revoke_feature_access(p_feature text, p_handle text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
  live   public.feature_access;
begin
  if p_handle is not null then
    select p.key into target from public.profiles p where p.handle = lower(trim(p_handle));
    if target is null then
      raise exception 'no such handle' using errcode = 'OQ404';
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('feature/' || coalesce(p_feature, '')));
  select * into live from public.feature_access f
    where f.feature = p_feature and f.user_key is not distinct from target;
  if live.key is null then
    return;
  end if;
  insert into public.feature_access_archive (key, feature, user_key, saved_at, saved_by, save_reason, archived_at)
  values (live.key, live.feature, live.user_key, live.saved_at, live.saved_by, live.save_reason, clock_timestamp());
  delete from public.feature_access where key = live.key;
end $$;

-- 4. Helpers (no grants; only the functions below call them, as their owner).
create function public.blog_url_hash(p_handle text, p_slug text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(lower(p_handle) || '/blog/' || lower(p_slug), 'UTF8')), 'hex');
$$;

-- What the database must guarantee about a draft document, or null when it's fine. The server
-- action validates the full shape (BlogDocumentSchema); this is the backstop.
create function public.blog_document_problem(p_document jsonb) returns text
language plpgsql set search_path = '' as $$
declare
  photo jsonb;
  place jsonb := p_document -> 'place';
begin
  if jsonb_typeof(p_document) is distinct from 'object'
     or (p_document ? 'title' and jsonb_typeof(p_document -> 'title') not in ('string', 'null'))
     or (p_document ? 'body' and jsonb_typeof(p_document -> 'body') not in ('string', 'null'))
     or (p_document ? 'photos' and jsonb_typeof(p_document -> 'photos') <> 'array')
     or (p_document ? 'place' and jsonb_typeof(place) not in ('object', 'null')) then
    return 'invalid document';
  end if;
  if char_length(p_document ->> 'title') > 100 or char_length(p_document ->> 'body') > 10000 then
    return 'too long';
  end if;
  if jsonb_array_length(coalesce(p_document -> 'photos', '[]'::jsonb)) > 10 then
    return 'too many photos';
  end if;
  if jsonb_typeof(place) = 'object'
     and (coalesce(trim(place ->> 'name'), '') = '' or char_length(place ->> 'name') > 60) then
    return 'invalid document';
  end if;
  for photo in select value from jsonb_array_elements(coalesce(p_document -> 'photos', '[]'::jsonb)) loop
    if jsonb_typeof(photo) <> 'object' then
      return 'invalid document';
    end if;
    begin
      if (photo ->> 'id')::uuid is null
         or coalesce((photo ->> 'width')::int, 0) <= 0 or coalesce((photo ->> 'height')::int, 0) <= 0 then
        return 'invalid document';
      end if;
    exception when others then
      return 'invalid document';
    end;
  end loop;
  begin
    perform (p_document ->> 'linkedQuestKey')::uuid, (p_document ->> 'startedAt')::timestamptz;
  exception when others then
    return 'invalid document';
  end;
  return null;
end $$;

-- A draft row from a (checked) document. Photos keep only id and size, the place only its names:
-- nothing else a caller sends, such as coordinates, is ever stored.
create function public.blog_draft_row(p_key uuid, p_owner uuid, p_document jsonb) returns public.blog_drafts
language plpgsql set search_path = '' as $$
declare
  draft public.blog_drafts;
  place jsonb := p_document -> 'place';
begin
  draft.key := p_key;
  draft.owner_key := p_owner;
  draft.title := p_document ->> 'title';
  draft.body := coalesce(p_document ->> 'body', '');
  draft.photos := coalesce((
    select jsonb_agg(jsonb_build_object('id', photo ->> 'id', 'width', (photo ->> 'width')::int,
      'height', (photo ->> 'height')::int) order by position)
    from jsonb_array_elements(coalesce(p_document -> 'photos', '[]'::jsonb)) with ordinality as list (photo, position)),
    '[]'::jsonb);
  draft.place := case when jsonb_typeof(place) = 'object' then jsonb_strip_nulls(jsonb_build_object(
    'name', trim(place ->> 'name'), 'city', place ->> 'city', 'countryCode', place ->> 'countryCode',
    'geoRef', place ->> 'geoRef')) end;
  draft.linked_trip_key := (p_document ->> 'linkedQuestKey')::uuid;
  draft.started_at := (p_document ->> 'startedAt')::timestamptz;
  return draft;
end $$;

create function public.archive_blog(p_row public.blogs, p_now timestamptz) returns void
language sql set search_path = '' as $$
  insert into public.blogs_archive (key, owner_key, slug, status, visibility, title, body, photos, place,
    linked_trip_key, comments_on, search_text, word_count, published_at, published_draft_saved_at,
    started_at, saved_at, saved_by, save_reason, archived_at)
  values ((p_row).key, (p_row).owner_key, (p_row).slug, (p_row).status, (p_row).visibility, (p_row).title,
    (p_row).body, (p_row).photos, (p_row).place, (p_row).linked_trip_key, (p_row).comments_on,
    (p_row).search_text, (p_row).word_count, (p_row).published_at, (p_row).published_draft_saved_at,
    (p_row).started_at, (p_row).saved_at, (p_row).saved_by, (p_row).save_reason, p_now);
  delete from public.blogs where key = (p_row).key;
$$;

-- Inserts a blogs row: the given row's values, with metadata set here.
create function public.insert_blog(p_row public.blogs, p_now timestamptz, p_by uuid, p_reason text)
returns void language sql set search_path = '' as $$
  insert into public.blogs (key, owner_key, slug, status, visibility, title, body, photos, place,
    linked_trip_key, comments_on, search_text, word_count, published_at, published_draft_saved_at,
    started_at, saved_at, saved_by, save_reason)
  values ((p_row).key, (p_row).owner_key, (p_row).slug, (p_row).status, (p_row).visibility, (p_row).title,
    (p_row).body, (p_row).photos, (p_row).place, (p_row).linked_trip_key, (p_row).comments_on,
    (p_row).search_text, (p_row).word_count, (p_row).published_at, (p_row).published_draft_saved_at,
    (p_row).started_at, p_now, p_by, p_reason);
$$;

create function public.archive_blog_draft(p_row public.blog_drafts, p_now timestamptz) returns void
language sql set search_path = '' as $$
  insert into public.blog_drafts_archive (key, owner_key, title, body, photos, place, linked_trip_key,
    started_at, saved_at, saved_by, save_reason, archived_at)
  values ((p_row).key, (p_row).owner_key, (p_row).title, (p_row).body, (p_row).photos, (p_row).place,
    (p_row).linked_trip_key, (p_row).started_at, (p_row).saved_at, (p_row).saved_by, (p_row).save_reason, p_now);
  delete from public.blog_drafts where key = (p_row).key;
$$;

create function public.insert_blog_draft(p_row public.blog_drafts, p_now timestamptz, p_by uuid, p_reason text)
returns void language sql set search_path = '' as $$
  insert into public.blog_drafts (key, owner_key, title, body, photos, place, linked_trip_key, started_at,
    saved_at, saved_by, save_reason)
  values ((p_row).key, (p_row).owner_key, (p_row).title, (p_row).body, (p_row).photos, (p_row).place,
    (p_row).linked_trip_key, (p_row).started_at, p_now, p_by, p_reason);
$$;

-- 5. Writes. Each one: owner check, lock the live row, compare saved_at (OQ409), archive, insert
--    with an explicit column list, return saved_at as text (the next save's conflict token).

-- The first save with content. The key was made in the browser when the composer opened, so
-- uploads could start before these rows existed. Blogs and Quests share the {user}/{key} storage
-- folder, so a key used by either is refused: deleting one must never delete the other's photos.
create function public.create_blog(p_key uuid, p_document jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  settings jsonb;
  problem  text;
  draft    public.blog_drafts;
begin
  if not public.has_feature_access('blogs') then
    raise exception 'no access' using errcode = 'OQ403';
  end if;
  select p.settings into settings from public.profiles p where p.key = user_key;
  if not found then
    raise exception 'no profile' using errcode = 'OQ404';
  end if;
  if exists (select 1 from public.blogs where key = p_key)
     or exists (select 1 from public.blogs_archive where key = p_key)
     or exists (select 1 from public.trips where key = p_key)
     or exists (select 1 from public.trips_archive where key = p_key) then
    raise exception 'key already used' using errcode = 'OQ410';
  end if;
  problem := public.blog_document_problem(p_document);
  if problem is not null then
    raise exception '%', problem using errcode = 'OQ422';
  end if;

  -- The live row holds what readers see: nothing until the first Post.
  insert into public.blogs (key, owner_key, slug, status, visibility, title, body, photos, place,
    linked_trip_key, comments_on, search_text, word_count, published_at, published_draft_saved_at,
    started_at, saved_at, saved_by, save_reason)
  values (p_key, user_key, null, 'draft',
    case when settings ->> 'defaultVisibility' in ('public', 'unlisted', 'private')
      then settings ->> 'defaultVisibility' else 'public' end,
    null, '', '[]', null, null, true, '', 0, null, null, null, now_ts, user_key, 'create');

  draft := public.blog_draft_row(p_key, user_key, p_document);
  perform public.insert_blog_draft(draft, now_ts, user_key, 'create');
  return now_ts::text;
end $$;

-- Autosave: archives the draft and inserts the new one. A stale p_based_on (another tab saved
-- first) fails with OQ409; the tab that is behind reloads (decision 0001 rule 4).
create function public.save_blog_draft(p_key uuid, p_based_on text, p_document jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  problem  text := public.blog_document_problem(p_document);
  live     public.blog_drafts;
begin
  if problem is not null then
    raise exception '%', problem using errcode = 'OQ422';
  end if;
  select * into live from public.blog_drafts where key = p_key and owner_key = user_key for update;
  if live.key is null then
    perform public.raise_missing('blog_drafts', p_key, user_key);
  end if;
  if live.saved_at::text <> p_based_on then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;

  perform public.archive_blog_draft(live, now_ts);
  perform public.insert_blog_draft(public.blog_draft_row(p_key, user_key, p_document), now_ts, user_key, 'save');
  return now_ts::text;
end $$;

-- Post: copies the draft to the live row. Checks both saved_at values, so a stale tab can't post
-- an old draft or overwrite a newer live row. The slug is set on the first publish and never
-- changes after. The draft itself is unchanged.
create function public.publish_blog(p_key uuid, p_based_on_draft text, p_based_on_blog text,
  p_visibility text, p_slug text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  user_key  uuid := public.require_user();
  now_ts    timestamptz := clock_timestamp();
  blog      public.blogs;
  draft     public.blog_drafts;
  title     text;
  new_slug  text;
  attempt   int := 1;
  first     boolean;
  next_row  public.blogs;
begin
  select * into blog from public.blogs where key = p_key and owner_key = user_key for update;
  if blog.key is null then
    perform public.raise_missing('blogs', p_key, user_key);
  end if;
  select * into draft from public.blog_drafts where key = p_key and owner_key = user_key for update;
  if draft.key is null then
    perform public.raise_missing('blog_drafts', p_key, user_key);
  end if;
  if blog.saved_at::text <> p_based_on_blog or draft.saved_at::text <> p_based_on_draft then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;

  first := blog.published_at is null;
  -- Visibility is chosen on the first Post; later Posts pass null to keep it.
  if (first and p_visibility is null) or p_visibility not in ('public', 'unlisted', 'private') then
    raise exception 'invalid visibility' using errcode = 'OQ422';
  end if;
  title := trim(draft.title);
  if title is null or char_length(title) not between 1 and 100
     or (draft.body !~ '\S' and jsonb_array_length(draft.photos) = 0) then
    raise exception 'empty' using errcode = 'OQ422';
  end if;
  if jsonb_array_length(draft.photos) > 10 then
    raise exception 'too many photos' using errcode = 'OQ422';
  end if;

  if first then
    if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) > 77 then
      raise exception 'invalid slug' using errcode = 'OQ422';
    end if;
    -- Unique among the owner's blogs and every removed blog URL under any handle they've had,
    -- so a deleted blog's link never starts opening a newer one.
    new_slug := p_slug;
    while exists (select 1 from public.blogs b where b.owner_key = user_key and b.slug = new_slug and b.key <> p_key)
       or exists (
         select 1 from public.handle_claims c join public.removed_blog_urls r
           on r.url_hash = public.blog_url_hash(c.handle, new_slug)
         where c.profile_key = user_key) loop
      attempt := attempt + 1;
      new_slug := p_slug || '-' || attempt;
    end loop;
  else
    new_slug := blog.slug;
  end if;

  next_row := blog;
  next_row.slug := new_slug;
  next_row.status := 'published';
  next_row.visibility := coalesce(p_visibility, blog.visibility);
  next_row.title := title;
  next_row.body := draft.body;
  next_row.photos := draft.photos;
  next_row.place := draft.place;
  -- Only the writer's own published Quest; anything else is dropped, never shown.
  next_row.linked_trip_key := (select t.key from public.trips t
    where t.key = draft.linked_trip_key and t.owner_key = user_key and t.status = 'published');
  next_row.search_text := lower(concat_ws(' ', title, draft.place ->> 'name', draft.place ->> 'city', draft.body));
  next_row.word_count := (select count(*)::int from regexp_split_to_table(title || ' ' || draft.body, '\s+') as words (word)
    where word <> '');
  next_row.published_at := coalesce(blog.published_at, now_ts);
  next_row.published_draft_saved_at := draft.saved_at;
  next_row.started_at := draft.started_at;

  perform public.archive_blog(blog, now_ts);
  perform public.insert_blog(next_row, now_ts, user_key, 'publish');
  return jsonb_build_object('saved_at', now_ts::text, 'slug', new_slug, 'first_publish', first);
end $$;

-- Visibility and comments: a new live row with one field changed. The URL never changes.
create function public.set_blog_visibility(p_key uuid, p_based_on text, p_visibility text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  blog     public.blogs;
  next_row public.blogs;
begin
  if p_visibility is null or p_visibility not in ('public', 'unlisted', 'private') then
    raise exception 'invalid visibility' using errcode = 'OQ422';
  end if;
  select * into blog from public.blogs where key = p_key and owner_key = user_key for update;
  if blog.key is null then
    perform public.raise_missing('blogs', p_key, user_key);
  end if;
  if blog.saved_at::text <> p_based_on then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;
  -- A draft's visibility is chosen when it's first posted.
  if blog.status <> 'published' then
    raise exception 'not published' using errcode = 'OQ422';
  end if;
  next_row := blog;
  next_row.visibility := p_visibility;
  perform public.archive_blog(blog, now_ts);
  perform public.insert_blog(next_row, now_ts, user_key, 'visibility');
  return now_ts::text;
end $$;

create function public.set_blog_comments(p_key uuid, p_based_on text, p_on boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  blog     public.blogs;
  next_row public.blogs;
begin
  select * into blog from public.blogs where key = p_key and owner_key = user_key for update;
  if blog.key is null then
    perform public.raise_missing('blogs', p_key, user_key);
  end if;
  if blog.saved_at::text <> p_based_on then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;
  next_row := blog;
  next_row.comments_on := coalesce(p_on, true);
  perform public.archive_blog(blog, now_ts);
  perform public.insert_blog(next_row, now_ts, user_key, 'comments');
  return now_ts::text;
end $$;

-- The one real delete (0001 rule 7): live rows and every archived row. A posted blog leaves a
-- tombstone under every handle the owner has had. Storage files are removed by the action first.
-- Migration 17 replaces this to delete likes, comments and notifications first.
create function public.delete_blog(p_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  blog     public.blogs;
  handles  text[];
begin
  select * into blog from public.blogs where key = p_key and owner_key = user_key for update;
  if blog.key is null then
    raise exception 'not found' using errcode = 'OQ404';
  end if;
  select coalesce(array_agg(handle order by saved_at), '{}') into handles
    from public.handle_claims where profile_key = user_key;

  if blog.published_at is not null then
    insert into public.removed_blog_urls (url_hash, blog_key, saved_at, saved_by, save_reason)
      select public.blog_url_hash(h, blog.slug), p_key, now_ts, user_key, 'create' from unnest(handles) as h
      on conflict (url_hash) do nothing;
  end if;

  delete from public.blog_drafts_archive where key = p_key;
  delete from public.blog_drafts where key = p_key;
  delete from public.blogs_archive where key = p_key;
  delete from public.blogs where key = p_key;
  return jsonb_build_object('handles', to_jsonb(handles), 'slug', blog.slug);
end $$;

-- 6. Public reads. Built from an explicit field list, so linked_trip_key, search_text, started_at,
--    published_draft_saved_at and the save metadata never leave.
create function public.get_blog(p_handle text, p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'blog', jsonb_build_object(
      'key', b.key, 'slug', b.slug, 'visibility', b.visibility, 'title', b.title, 'body', b.body,
      'photos', coalesce((
        select jsonb_agg(jsonb_build_object('id', photo ->> 'id', 'width', (photo ->> 'width')::int,
          'height', (photo ->> 'height')::int) order by position)
        from jsonb_array_elements(b.photos) with ordinality as list (photo, position)), '[]'::jsonb),
      'place', case when b.place is not null then jsonb_build_object('name', b.place ->> 'name') end,
      'comments_on', b.comments_on, 'word_count', b.word_count,
      'published_at', b.published_at, 'saved_at', b.saved_at),
    'owner', jsonb_build_object('key', p.key, 'handle', p.handle, 'name', p.name, 'avatar_url', p.avatar_url),
    'photo_folder', b.owner_key::text || '/' || b.key::text)
  from public.blogs b
  join public.profiles p on p.key = b.owner_key
  where p.handle = lower(p_handle)
    and b.slug = lower(p_slug)
    and b.status = 'published'
    and b.visibility in ('public', 'unlisted');
$$;

-- Only the word, never the key: a private blog's key must not leak to whoever has its URL.
create function public.get_blog_status(p_handle text, p_slug text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (
      select 1 from public.blogs b join public.profiles p on p.key = b.owner_key
      where p.handle = lower(p_handle) and b.slug = lower(p_slug)
        and b.status = 'published' and b.visibility = 'private') then 'private'
    when exists (
      select 1 from public.removed_blog_urls r
      where r.url_hash = public.blog_url_hash(p_handle, p_slug)) then 'removed'
  end;
$$;

-- The linked Quest's card for readers (spec D12): a blog never makes a Quest more visible. A
-- public blog shows only a public Quest; an unlisted blog shows a public or unlisted one. Private
-- Quests, other people's Quests and deleted ones never show. The writer sees theirs through
-- get_my_blog_state (migration 17).
create function public.get_blog_quest(p_blog_key uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.quest_card_json(t)
  from public.blogs b
  join public.trips t on t.key = b.linked_trip_key and t.owner_key = b.owner_key
  where b.key = p_blog_key
    and b.status = 'published' and b.visibility in ('public', 'unlisted')
    and t.status = 'published'
    and (t.visibility = 'public' or (t.visibility = 'unlisted' and b.visibility = 'unlisted'));
$$;

create function public.list_sitemap_blogs()
returns table (handle text, slug text, saved_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.handle, b.slug, b.saved_at
  from public.blogs b
  join public.profiles p on p.key = b.owner_key
  where b.status = 'published' and b.visibility = 'public' and b.word_count >= 80
  order by b.saved_at desc;
$$;

-- 7. create_trip (migration 9, same arguments and grant) also refuses a blog's key: they share
--    the storage folder (spec §3.1).
create or replace function public.create_trip(p_key uuid, p_template_id text default 'beach') returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key   uuid := public.require_user();
  now_ts     timestamptz := clock_timestamp();
  settings   jsonb;
  empty      jsonb := '{"favourites": [], "days": []}';
begin
  select p.settings into settings from public.profiles p where p.key = user_key;
  if not found then
    raise exception 'no profile' using errcode = 'OQ404';
  end if;
  if exists (select 1 from public.trips where key = p_key)
     or exists (select 1 from public.trips_archive where key = p_key)
     or exists (select 1 from public.blogs where key = p_key)
     or exists (select 1 from public.blogs_archive where key = p_key) then
    raise exception 'key already used' using errcode = 'OQ410';
  end if;

  insert into public.trips (key, owner_key, slug, template_id, visibility, status, title, short_title,
    start_date, end_date, cover_photo_key, seed, content, word_count, published_at, photos, places,
    comments_on, search_text, published_draft_saved_at, started_at, saved_at, saved_by, save_reason)
  values (p_key, user_key, 'trip-' || substr(md5(random()::text || p_key::text), 1, 6), p_template_id,
    coalesce(settings ->> 'defaultVisibility', 'public'), 'draft', null, null, null, null, null,
    floor(random() * 2147483647)::int, empty, 0, null, '[]', '[]', true, '', null, null,
    now_ts, user_key, 'create');

  insert into public.trip_drafts (key, owner_key, template_id, title, short_title, start_date, end_date,
    cover_photo_key, content, photos, places, started_at, saved_at, saved_by, save_reason)
  values (p_key, user_key, p_template_id, null, null, null, null, null, empty, '[]', '[]', null,
    now_ts, user_key, 'create');

  return now_ts::text;
end $$;

-- 8. Account deletion (migration 12 definitions) now covers blogs. Must ship with the tables: the
--    deferred blogs.owner_key foreign key would otherwise fail the profile delete at commit.
--    Blog tombstones are kept, like Quest ones. Returns own_blogs in addition.
create or replace function public.delete_account_data(p_user_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  now_ts       timestamptz := clock_timestamp();
  handles      text[];
  own_trips    jsonb;
  own_blogs    jsonb;
  touched      uuid[];
  follow_keys  uuid[];
begin
  select coalesce(array_agg(handle order by saved_at), '{}') into handles
    from public.handle_claims where profile_key = p_user_key;
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'slug', slug)), '[]'::jsonb) into own_trips
    from public.trips where owner_key = p_user_key and published_at is not null;
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'slug', slug)), '[]'::jsonb) into own_blogs
    from public.blogs where owner_key = p_user_key and published_at is not null;
  select coalesce(array_agg(distinct trip_key), '{}') into touched from (
    select trip_key from public.likes where user_key = p_user_key
    union select trip_key from public.comments where author_key = p_user_key) mine
    where trip_key not in (select key from public.trips where owner_key = p_user_key);
  select coalesce(array_agg(distinct person), '{}') into follow_keys from (
    select followee_key as person from public.follows where follower_key = p_user_key
    union select follower_key from public.follows where followee_key = p_user_key) people;

  -- Every published link under every handle they had shows "This Quest/blog was removed.".
  insert into public.removed_trip_urls (url_hash, trip_key, saved_at, saved_by, save_reason)
    select public.trip_url_hash(h, t.slug), t.key, now_ts, p_user_key, 'create'
    from public.trips t, unnest(handles) as h
    where t.owner_key = p_user_key and t.published_at is not null
    on conflict (url_hash) do nothing;
  insert into public.removed_blog_urls (url_hash, blog_key, saved_at, saved_by, save_reason)
    select public.blog_url_hash(h, b.slug), b.key, now_ts, p_user_key, 'create'
    from public.blogs b, unnest(handles) as h
    where b.owner_key = p_user_key and b.published_at is not null
    on conflict (url_hash) do nothing;

  -- Reactions on their Quests, and theirs on anyone's.
  delete from public.notifications where recipient_key = p_user_key or actor_key = p_user_key
    or saved_by = p_user_key -- like notifications name nobody, but record who caused them
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.likes_archive where user_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.likes where user_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.comments_archive where author_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.comments where author_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.follows_archive where p_user_key in (follower_key, followee_key);
  delete from public.follows where p_user_key in (follower_key, followee_key);
  delete from public.notification_reads_archive where key = p_user_key;
  delete from public.notification_reads where key = p_user_key;
  delete from public.geocoder_calls where user_key = p_user_key;
  delete from public.feature_access_archive where user_key = p_user_key;
  delete from public.feature_access where user_key = p_user_key;

  -- Their blogs, drafts first (live and archived rows).
  delete from public.blog_drafts_archive where owner_key = p_user_key;
  delete from public.blog_drafts where owner_key = p_user_key;
  delete from public.blogs_archive where owner_key = p_user_key;
  delete from public.blogs where owner_key = p_user_key;

  -- Their Quests (legacy rows first), then the profile.
  delete from public.places where trip_id in (select key from public.trips where owner_key = p_user_key);
  delete from public.photos where owner_id = p_user_key;
  delete from public.trip_drafts_archive where key in (select key from public.trips where owner_key = p_user_key);
  delete from public.trip_drafts where owner_key = p_user_key;
  delete from public.trips_archive where key in (select key from public.trips where owner_key = p_user_key);
  delete from public.trips where owner_key = p_user_key;
  delete from public.profiles_archive where key = p_user_key;
  delete from public.profiles where key = p_user_key;

  return jsonb_build_object(
    'liked_or_commented_trip_keys', to_jsonb(touched),
    'follow_profile_keys', to_jsonb(follow_keys),
    'own_trips', own_trips,
    'own_blogs', own_blogs,
    'handles', to_jsonb(handles));
end $$;

-- A half-finished deletion of someone who only had blogs stays on the daily job.
create or replace function public.list_pending_deletions() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(d.key order by d.saved_at), '{}') from public.deleted_accounts d
  where exists (select 1 from auth.users u where u.id = d.key)
     or exists (select 1 from public.profiles p where p.key = d.key)
     or exists (select 1 from public.trips t where t.owner_key = d.key)
     or exists (select 1 from public.trips_archive t where t.owner_key = d.key)
     or exists (select 1 from public.profiles_archive p where p.key = d.key)
     or exists (select 1 from public.blogs b where b.owner_key = d.key)
     or exists (select 1 from public.blogs_archive b where b.owner_key = d.key)
     or exists (select 1 from public.blog_drafts b where b.owner_key = d.key);
$$;

-- 9. Weekly cleanup (migration 12) gains the blog archives (decision 0001 amendment 1; blog drafts
--    are kept 30 days because autosave archives on every save, spec D5).
create or replace function public.run_retention_cleanup(p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.trips_archive where archived_at < p_now - interval '180 days';
  delete from public.trip_drafts_archive where archived_at < p_now - interval '180 days';
  delete from public.profiles_archive where archived_at < p_now - interval '180 days';
  delete from public.geocoder_calls where called_at < p_now - interval '1 day';
  delete from public.likes_archive where archived_at < p_now - interval '90 days';
  delete from public.comments_archive where archived_at < p_now - interval '90 days';
  delete from public.follows_archive where archived_at < p_now - interval '90 days';
  delete from public.notification_reads_archive where archived_at < p_now - interval '180 days';
  delete from public.notifications where saved_at < p_now - interval '365 days';
  delete from public.email_send_log where saved_at < p_now - interval '7 days';
  delete from public.blogs_archive where archived_at < p_now - interval '180 days';
  delete from public.blog_drafts_archive where archived_at < p_now - interval '30 days';
  delete from public.feature_access_archive where archived_at < p_now - interval '180 days';
  -- Only finished deletions: never a marker whose user still has an auth row or data.
  delete from public.deleted_accounts d
  where d.saved_at < p_now - interval '30 days'
    and not (d.key = any (public.list_pending_deletions()));
end $$;

-- 10. Grants (migration 11: nothing is callable unless granted here). Replaced functions keep
--     their grants: create_trip (authenticated), delete_account_data, list_pending_deletions and
--     run_retention_cleanup (service_role).
grant execute on function public.get_blog(text, text), public.get_blog_status(text, text),
  public.get_blog_quest(uuid), public.list_sitemap_blogs() to anon, authenticated;
grant execute on function public.has_feature_access(text), public.create_blog(uuid, jsonb),
  public.save_blog_draft(uuid, text, jsonb), public.publish_blog(uuid, text, text, text, text),
  public.set_blog_visibility(uuid, text, text), public.set_blog_comments(uuid, text, boolean),
  public.delete_blog(uuid) to authenticated;
grant execute on function public.grant_feature_access(text, text), public.revoke_feature_access(text, text)
  to service_role;
