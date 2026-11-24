-- 17. Blog likes, comments, notifications, feed, Explore, search and profiles (docs/specs/blogs.md
-- §3.4–3.6, §4.3, §5; task BL-02). Same rules as migrations 10–16: rows never change (decision
-- 0001), every write is one function, foreign keys are deferred, and (since migration 11) nothing
-- is callable until granted at the end. Every replaced function starts from its latest
-- definition, named next to it, and keeps its arguments, defaults, returned fields and grants.
-- Error codes: OQ401 not signed in, OQ403 not allowed (comments off, not the owner),
-- OQ404 not found / not visible, OQ422 invalid, OQ429 too fast.

-- 1. Tables: straight copies of likes and comments (migration 10), keyed by blog (spec D1).
create table public.blog_likes (
  key         uuid        primary key,
  blog_key    uuid        not null,
  user_key    uuid        not null,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create'),
  unique (blog_key, user_key), -- one like per person, live rows only
  constraint blog_likes_blog_key_fkey foreign key (blog_key) references public.blogs (key)
    on delete no action deferrable initially deferred,
  constraint blog_likes_user_key_fkey foreign key (user_key) references public.profiles (key)
    on delete no action deferrable initially deferred
);
create index blog_likes_by_blog on public.blog_likes (blog_key);
create table public.blog_likes_archive (
  key uuid not null, blog_key uuid not null, user_key uuid not null, saved_at timestamptz not null,
  saved_by uuid, save_reason text not null, archived_at timestamptz not null,
  primary key (key, saved_at)
);

create table public.blog_comments (
  key         uuid        primary key,
  blog_key    uuid        not null,
  author_key  uuid        not null,
  body        text        not null check (char_length(body) between 1 and 300),
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create'),
  constraint blog_comments_blog_key_fkey foreign key (blog_key) references public.blogs (key)
    on delete no action deferrable initially deferred,
  constraint blog_comments_author_key_fkey foreign key (author_key) references public.profiles (key)
    on delete no action deferrable initially deferred
);
create index blog_comments_by_blog on public.blog_comments (blog_key, saved_at);
create index blog_comments_by_author on public.blog_comments (author_key);
create table public.blog_comments_archive (
  key uuid not null, blog_key uuid not null, author_key uuid not null, body text not null,
  saved_at timestamptz not null, saved_by uuid, save_reason text not null,
  archived_at timestamptz not null,
  primary key (key, saved_at)
);

-- The bell is one stream: a blog notification is a notifications row with blog_key instead of
-- trip_key. A schema change, not a row update. The previous release inserts trip_key only and
-- ignores the new field in results.
alter table public.notifications add column blog_key uuid;
alter table public.notifications add constraint notifications_blog_key_fkey foreign key (blog_key)
  references public.blogs (key) on delete no action deferrable initially deferred;
alter table public.notifications add constraint notifications_one_subject
  check (trip_key is null or blog_key is null);
create index notifications_by_blog on public.notifications (blog_key);

-- 2. Access, as for likes and comments: owners read their own rows; comments only through
--    get_blog_social; every write through the functions below. No anonymous policy anywhere.
alter table public.blog_likes enable row level security;
alter table public.blog_likes_archive enable row level security;
alter table public.blog_comments enable row level security;
alter table public.blog_comments_archive enable row level security;

create policy "read own blog likes" on public.blog_likes for select to authenticated
  using (user_key = (select auth.uid()));
create policy "read own archived blog likes" on public.blog_likes_archive for select to authenticated
  using (user_key = (select auth.uid()));
create policy "read own archived blog comments" on public.blog_comments_archive for select to authenticated
  using (author_key = (select auth.uid()));

revoke all on public.blog_likes, public.blog_likes_archive, public.blog_comments, public.blog_comments_archive
  from anon, authenticated, service_role;
grant select on public.blog_likes, public.blog_likes_archive, public.blog_comments_archive
  to authenticated, service_role;
grant select on public.blog_comments to service_role;

-- 3. Helpers (no grants; only the functions below call them, as their owner).

-- Who may see a blog: posted public or unlisted, or its writer (can_see_trip, migration 10).
create function public.can_see_blog(p_blog_key uuid, p_user_key uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.blogs b
    where b.key = p_blog_key
      and ((b.status = 'published' and b.visibility in ('public', 'unlisted')) or b.owner_key = p_user_key)
  );
$$;

-- A blog as a card (spec §4.1, snake_case): profile, Quests tab, feed, Explore and search. From
-- the live row. The excerpt is at most 150 characters, so even 150 emoji stay within the app's
-- 300-unit limit.
create function public.blog_card_json(b public.blogs) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'key', b.key, 'title', b.title, 'status', b.status, 'visibility', b.visibility,
    'path', case when b.status = 'published' then '/@' || p.handle || '/blog/' || b.slug end,
    'excerpt', left(btrim(regexp_replace(b.body, '\s+', ' ', 'g')), 150),
    'cover_photo_key', b.photos -> 0 ->> 'id',
    'photo_folder', b.owner_key::text || '/' || b.key::text,
    'photo_count', jsonb_array_length(b.photos),
    'word_count', b.word_count,
    'place_name', b.place ->> 'name',
    'like_count', (select count(*) from public.blog_likes l where l.blog_key = b.key),
    'comment_count', case when b.comments_on
      then (select count(*) from public.blog_comments c where c.blog_key = b.key) else 0 end,
    'published_at', b.published_at,
    'saved_at', b.saved_at::text,
    'owner', public.person_json(p))
  from public.profiles p where p.key = b.owner_key;
$$;

-- Public posted blogs with their counts and score at p_now (public_quests_scored, migration 13).
-- Comments off counts no comments. Used by the feed, Explore and search.
create function public.public_blogs_scored(p_now timestamptz)
returns table (blog public.blogs, like_count bigint, comment_count bigint, score double precision)
language sql stable set search_path = '' as $$
  select b, counts.likes, counts.comments,
    public.quest_score(counts.likes, counts.comments, b.published_at, p_now)
  from public.blogs b,
    lateral (select
      (select count(*) from public.blog_likes l where l.blog_key = b.key) as likes,
      case when b.comments_on then (select count(*) from public.blog_comments c where c.blog_key = b.key)
        else 0 end as comments) counts
  where b.status = 'published' and b.visibility = 'public' and b.published_at <= p_now;
$$;

-- 4. Likes (set_like, migration 10). "Set state", not an edit: repeated taps never add likes.
--    Notifies only on the person's first like ever on that blog, and names nobody.
create function public.set_blog_like(p_blog_key uuid, p_liked boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  liker      uuid := public.require_user();
  now_ts     timestamptz := clock_timestamp();
  blog_owner uuid;
  live       public.blog_likes;
  notified   boolean := false;
begin
  if not public.can_see_blog(p_blog_key, liker) then
    raise exception 'not visible' using errcode = 'OQ404';
  end if;
  select owner_key into blog_owner from public.blogs where key = p_blog_key;
  -- Serialises one person's taps on one blog, so two at once can't both insert.
  perform pg_advisory_xact_lock(hashtext('blog-like/' || p_blog_key::text || '/' || liker::text));
  select * into live from public.blog_likes l where l.blog_key = p_blog_key and l.user_key = liker;

  if p_liked and live.key is null then
    if blog_owner <> liker and not exists (
      select 1 from public.blog_likes_archive a where a.blog_key = p_blog_key and a.user_key = liker
    ) then
      insert into public.notifications (key, recipient_key, kind, actor_key, trip_key, blog_key, comment_key,
        saved_at, saved_by, save_reason)
      values (gen_random_uuid(), blog_owner, 'like', null, null, p_blog_key, null, now_ts, liker, 'create');
      notified := true;
    end if;
    insert into public.blog_likes (key, blog_key, user_key, saved_at, saved_by, save_reason)
    values (gen_random_uuid(), p_blog_key, liker, now_ts, liker, 'create');
  elsif not p_liked and live.key is not null then
    insert into public.blog_likes_archive (key, blog_key, user_key, saved_at, saved_by, save_reason, archived_at)
    values (live.key, live.blog_key, live.user_key, live.saved_at, live.saved_by, live.save_reason, now_ts);
    delete from public.blog_likes where key = live.key;
  end if;

  return jsonb_build_object(
    'liked', p_liked,
    -- The owner was told (bell): the server sends the matching email.
    'notified', notified,
    'like_count', (select count(*) from public.blog_likes where blog_key = p_blog_key));
end $$;

-- 5. Comments (post_comment, migration 10). The limit is 5 a minute per person across Quest and
--    blog comments together (spec D13); post_comment below counts both too, and both take the
--    same lock, so they serialise each other.
create function public.post_blog_comment(p_blog_key uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  blog     public.blogs;
  new_body text := trim(p_body);
  new_key  uuid := gen_random_uuid();
begin
  if new_body is null or char_length(new_body) not between 1 and 300 then
    raise exception 'invalid comment' using errcode = 'OQ422';
  end if;
  if not public.can_see_blog(p_blog_key, user_key) then
    raise exception 'not visible' using errcode = 'OQ404';
  end if;
  select * into blog from public.blogs where key = p_blog_key;
  if blog.status <> 'published' then
    raise exception 'not visible' using errcode = 'OQ404';
  end if;
  if not blog.comments_on then
    raise exception 'comments off' using errcode = 'OQ403';
  end if;
  perform pg_advisory_xact_lock(hashtext('comment/' || user_key::text));
  if (select count(*) from public.comments c
      where c.author_key = user_key and c.saved_at > now_ts - interval '1 minute')
   + (select count(*) from public.blog_comments c
      where c.author_key = user_key and c.saved_at > now_ts - interval '1 minute') >= 5 then
    raise exception 'too fast' using errcode = 'OQ429';
  end if;

  insert into public.blog_comments (key, blog_key, author_key, body, saved_at, saved_by, save_reason)
  values (new_key, p_blog_key, user_key, new_body, now_ts, user_key, 'create');
  if blog.owner_key <> user_key then
    insert into public.notifications (key, recipient_key, kind, actor_key, trip_key, blog_key, comment_key,
      saved_at, saved_by, save_reason)
    values (gen_random_uuid(), blog.owner_key, 'comment', user_key, null, p_blog_key, new_key, now_ts, user_key,
      'create');
  end if;
  return jsonb_build_object('key', new_key, 'saved_at', now_ts::text);
end $$;

-- Replaced (migration 10 definition, same arguments, result and grant). The only change: the
-- rate limit also counts blog comments, so it holds both ways.
create or replace function public.post_comment(p_trip_key uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  trip     public.trips;
  new_body text := trim(p_body);
  new_key  uuid := gen_random_uuid();
begin
  if new_body is null or char_length(new_body) not between 1 and 300 then
    raise exception 'invalid comment' using errcode = 'OQ422';
  end if;
  if not public.can_see_trip(p_trip_key, user_key) then
    raise exception 'not visible' using errcode = 'OQ404';
  end if;
  select * into trip from public.trips where key = p_trip_key;
  if trip.status <> 'published' then
    raise exception 'not visible' using errcode = 'OQ404';
  end if;
  if not trip.comments_on then
    raise exception 'comments off' using errcode = 'OQ403';
  end if;
  perform pg_advisory_xact_lock(hashtext('comment/' || user_key::text));
  if (select count(*) from public.comments c
      where c.author_key = user_key and c.saved_at > now_ts - interval '1 minute')
   + (select count(*) from public.blog_comments c
      where c.author_key = user_key and c.saved_at > now_ts - interval '1 minute') >= 5 then
    raise exception 'too fast' using errcode = 'OQ429';
  end if;

  insert into public.comments (key, trip_key, author_key, body, saved_at, saved_by, save_reason)
  values (new_key, p_trip_key, user_key, new_body, now_ts, user_key, 'create');
  if trip.owner_key <> user_key then
    insert into public.notifications (key, recipient_key, kind, actor_key, trip_key, comment_key,
      saved_at, saved_by, save_reason)
    values (gen_random_uuid(), trip.owner_key, 'comment', user_key, p_trip_key, new_key, now_ts, user_key, 'create');
  end if;
  return jsonb_build_object('key', new_key, 'saved_at', now_ts::text);
end $$;

-- Only the blog's writer deletes comments (abuse: one tap). Archived for 90 days.
create function public.delete_blog_comment(p_comment_key uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  live     public.blog_comments;
begin
  select * into live from public.blog_comments where key = p_comment_key for update;
  if live.key is null then
    raise exception 'not found' using errcode = 'OQ404';
  end if;
  if not exists (select 1 from public.blogs b where b.key = live.blog_key and b.owner_key = user_key) then
    raise exception 'not owner' using errcode = 'OQ403';
  end if;
  insert into public.blog_comments_archive (key, blog_key, author_key, body, saved_at, saved_by, save_reason,
    archived_at)
  values (live.key, live.blog_key, live.author_key, live.body, live.saved_at, user_key, 'delete', now_ts);
  delete from public.blog_comments where key = live.key;
  return live.blog_key; -- for the blog-social cache tag
end $$;

-- 6. Reads for the blog page. Likes are anonymous: only a count, never who. Same shape as
--    get_trip_social, so the app's QuestSocial parser reads it.
create function public.get_blog_social(p_blog_key uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'like_count', (select count(*) from public.blog_likes l where l.blog_key = b.key),
    'comments_on', b.comments_on,
    -- Comments off hides every comment, the count included.
    'comment_count', case when b.comments_on
      then (select count(*) from public.blog_comments c where c.blog_key = b.key) else 0 end,
    'comments', case when b.comments_on then coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', c.key, 'body', c.body, 'saved_at', c.saved_at,
        'author', jsonb_build_object('key', p.key, 'handle', p.handle, 'name', coalesce(p.name, p.handle),
          'avatar_url', p.avatar_url)) order by c.saved_at, c.key)
      from (select * from public.blog_comments c where c.blog_key = b.key
            order by c.saved_at desc, c.key desc limit 100) c
      join public.profiles p on p.key = c.author_key), '[]'::jsonb) else '[]'::jsonb end
  )
  from public.blogs b
  where b.key = p_blog_key and b.status = 'published' and b.visibility in ('public', 'unlisted');
$$;

-- What the signed-in viewer needs that the cached page can't know. The writer also gets the
-- ⋯ menu's conflict token and, when readers can't see the linked Quest (deleted, private, or
-- unlisted on a public blog; spec D12), that flag and the Quest's card if it still exists.
create function public.get_my_blog_state(p_blog_key uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'liked', exists (select 1 from public.blog_likes l where l.blog_key = p_blog_key and l.user_key = auth.uid()),
    'is_owner', mine.key is not null)
  || case when mine.key is null then '{}'::jsonb else jsonb_strip_nulls(jsonb_build_object(
    'saved_at', mine.saved_at::text,
    'visibility', mine.visibility,
    'comments_on', mine.comments_on,
    'linked_quest_hidden', mine.linked_trip_key is not null and public.get_blog_quest(mine.key) is null,
    'own_linked_quest', case when mine.linked_trip_key is not null and public.get_blog_quest(mine.key) is null
      then (select public.quest_card_json(t) from public.trips t
            where t.key = mine.linked_trip_key and t.owner_key = mine.owner_key) end)) end
  from (select 1) one
  left join public.blogs mine on mine.key = p_blog_key and mine.owner_key = auth.uid();
$$;

-- The writer's own blogs, drafts included (Quests tab and own profile). Title, excerpt, cover and
-- place come from the draft, which is what they last wrote; status, path and counts from the live
-- row. Newest draft save first.
create function public.list_my_blogs() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.blog_card_json(b) || jsonb_build_object(
      'title', d.title,
      'excerpt', left(btrim(regexp_replace(d.body, '\s+', ' ', 'g')), 150),
      'cover_photo_key', d.photos -> 0 ->> 'id',
      'photo_count', jsonb_array_length(d.photos),
      'word_count', (select count(*)::int
        from regexp_split_to_table(coalesce(d.title, '') || ' ' || d.body, '\s+') as words (word)
        where word <> ''),
      'place_name', d.place ->> 'name',
      'comments_on', b.comments_on,
      'draft_saved_at', d.saved_at::text)
    order by d.saved_at desc, b.key), '[]'::jsonb)
  from public.blogs b
  join public.blog_drafts d on d.key = b.key
  where b.owner_key = auth.uid();
$$;

-- Blogs whose comment lists show my name and photo, for refreshing them after a profile edit.
create function public.list_my_comment_blog_keys() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct c.blog_key), '{}') from public.blog_comments c
  where c.author_key = auth.uid();
$$;

-- 7. Home feed (S2): Quests and public blogs from people I follow, one list by quest_score.
--    list_feed (migration 13) stays as it was for the previous release. p_now is fixed by the
--    first page, so the order doesn't move between pages (except through new likes).
create function public.list_home_feed(p_now timestamptz, p_limit int default 10, p_offset int default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  with at as (
    select least(coalesce(p_now, now()), now()) as now_ts
  ),
  candidates as (
    select (q.trip).key as key, q.score, q.trip, null::public.blogs as blog
    from at, public.public_quests_scored(at.now_ts) q
    where exists (select 1 from public.follows f
                  where f.follower_key = auth.uid() and f.followee_key = (q.trip).owner_key)
    union all
    select (s.blog).key, s.score, null::public.trips, s.blog
    from at, public.public_blogs_scored(at.now_ts) s
    where exists (select 1 from public.follows f
                  where f.follower_key = auth.uid() and f.followee_key = (s.blog).owner_key)
  ),
  page as (
    select * from candidates
    order by score desc, key
    limit least(greatest(coalesce(p_limit, 10), 1), 20) offset greatest(coalesce(p_offset, 0), 0)
  )
  select coalesce(jsonb_agg(
    -- (row).key, not "row is not null": that is false for a row with any null column.
    case when (p.trip).key is not null
      then public.quest_card_json(p.trip) || jsonb_build_object('type', 'quest',
        'liked_by_me', exists (select 1 from public.likes l where l.trip_key = p.key and l.user_key = auth.uid()))
      else public.blog_card_json(p.blog) || jsonb_build_object('type', 'blog',
        'liked_by_me', exists (select 1 from public.blog_likes l where l.blog_key = p.key and l.user_key = auth.uid()))
    end
    order by p.score desc, p.key), '[]'::jsonb)
  from page p;
$$;

-- 8. Explore (S3): public blogs, the last 30 days first, then older, each by score.
create function public.list_explore_blogs(p_limit int default 6)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.blog_card_json(s.blog) order by s.recent desc, s.score desc, (s.blog).key),
    '[]'::jsonb)
  from (
    select q.*, (q.blog).published_at >= now() - interval '30 days' as recent
    from public.public_blogs_scored(now()) q
    order by recent desc, q.score desc, (q.blog).key
    limit least(greatest(coalesce(p_limit, 6), 1), 10)
  ) s;
$$;

-- 9. Search (migration 13 definition, same arguments): + blogs. A blog matches on its search text
--    (title, place and body); it's ranked by similarity on its title and place only, because
--    similarity against 10,000 characters of body means nothing, then by score.
create or replace function public.search_public(p_query text, p_limit int default 10)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  query     text := lower(trim(p_query));
  pattern   text;
  max_rows  int := least(greatest(coalesce(p_limit, 10), 1), 10);
  trigram   boolean := exists (select 1 from pg_extension where extname = 'pg_trgm');
  quests    jsonb;
  people    jsonb;
  blogs     jsonb;
begin
  if query is null or char_length(query) not between 2 and 60 then
    raise exception 'search text must be 2 to 60 characters' using errcode = 'OQ422';
  end if;
  -- % and _ in what people type are letters, not wildcards.
  pattern := '%' || replace(replace(replace(query, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  if trigram then
    execute $q$
      select coalesce(jsonb_agg(public.quest_card_json(s.trip) order by s.rank desc, s.score desc), '[]'::jsonb)
      from (
        select q.trip, q.score, extensions.similarity((q.trip).search_text, $1) as rank
        from public.public_quests_scored(now()) q
        where (q.trip).search_text ilike $2 or extensions.similarity((q.trip).search_text, $1) > 0.3
        order by rank desc, q.score desc limit $3) s
    $q$ into quests using query, pattern, max_rows;
    execute $q$
      select coalesce(jsonb_agg(public.person_json(s.p) order by s.rank desc, (s.p).handle), '[]'::jsonb)
      from (
        select p, extensions.similarity(public.person_search_text(p.handle, p.name, p.home_city), $1) as rank
        from public.profiles p
        where public.person_search_text(p.handle, p.name, p.home_city) ilike $2
           or extensions.similarity(public.person_search_text(p.handle, p.name, p.home_city), $1) > 0.3
        order by rank desc, p.handle limit $3) s
    $q$ into people using query, pattern, max_rows;
    execute $q$
      select coalesce(jsonb_agg(public.blog_card_json(s.blog) order by s.rank desc, s.score desc, (s.blog).key),
        '[]'::jsonb)
      from (
        select q.blog, q.score, extensions.similarity(
          lower(coalesce((q.blog).title, '') || ' ' || coalesce((q.blog).place ->> 'name', '')), $1) as rank
        from public.public_blogs_scored(now()) q
        where (q.blog).search_text ilike $2
        order by rank desc, q.score desc, (q.blog).key limit $3) s
    $q$ into blogs using query, pattern, max_rows;
  else
    select coalesce(jsonb_agg(public.quest_card_json(s.trip) order by s.score desc), '[]'::jsonb) into quests
    from (select q.trip, q.score from public.public_quests_scored(now()) q
          where (q.trip).search_text ilike pattern order by q.score desc limit max_rows) s;
    select coalesce(jsonb_agg(public.person_json(s.p) order by (s.p).handle), '[]'::jsonb) into people
    from (select p from public.profiles p
          where public.person_search_text(p.handle, p.name, p.home_city) ilike pattern
          order by p.handle limit max_rows) s;
    select coalesce(jsonb_agg(public.blog_card_json(s.blog) order by s.score desc, (s.blog).key), '[]'::jsonb)
      into blogs
    from (select q.blog, q.score from public.public_blogs_scored(now()) q
          where (q.blog).search_text ilike pattern order by q.score desc, (q.blog).key limit max_rows) s;
  end if;
  return jsonb_build_object('quests', quests, 'people', people, 'blogs', blogs);
end $$;

-- 10. Profiles (migration 14 definition, same argument): + blogs, the public posted ones, newest
--     first. Every other field is unchanged.
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
        from shown group by name) named), '[]'::jsonb),
    'blogs', coalesce((
      select jsonb_agg(public.blog_card_json(b) order by b.published_at desc, b.key)
      from public.blogs b join p on b.owner_key = p.key
      where b.status = 'published' and b.visibility = 'public'), '[]'::jsonb)
  )
  where exists (select 1 from p);
$$;

-- Profiles with at least one public Quest or public blog, for the sitemap (migration 12
-- definition; spec D9: a profile with public writing isn't thin).
create or replace function public.list_sitemap_profiles()
returns table (handle text, saved_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.handle, p.saved_at from public.profiles p
  where exists (select 1 from public.trips t
                where t.owner_key = p.key and t.status = 'published' and t.visibility = 'public')
     or exists (select 1 from public.blogs b
                where b.owner_key = p.key and b.status = 'published' and b.visibility = 'public')
  order by p.saved_at desc;
$$;

-- 11. The bell (migration 10 definition, same arguments): + a blog object next to quest, and
--     comment excerpts from blog comments too. Likes are grouped per Quest or blog per day.
create or replace function public.list_my_notifications(p_limit int default 30, p_before text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (
    select auth.uid() as key,
      coalesce((select r.seen_until from public.notification_reads r where r.key = auth.uid()), '-infinity') as seen_until
  ),
  mine as (
    select n.* from public.notifications n, me
    where n.recipient_key = me.key and (p_before is null or n.saved_at < p_before::timestamptz)
  ),
  grouped as (
    select (array_agg(key order by saved_at desc))[1] as key, 'like'::text as kind, max(saved_at) as saved_at,
      count(*)::int as like_count, null::uuid as actor_key, trip_key, blog_key, null::uuid as comment_key
    from mine where kind = 'like'
    group by trip_key, blog_key, (saved_at at time zone 'UTC')::date
    union all
    select key, kind, saved_at, null, actor_key, trip_key, blog_key, comment_key from mine where kind <> 'like'
  ),
  page as (
    select * from grouped order by saved_at desc, key desc limit least(greatest(coalesce(p_limit, 30), 1), 50)
  )
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'key', g.key, 'kind', g.kind, 'saved_at', g.saved_at, 'unread', g.saved_at > me.seen_until,
    'like_count', g.like_count,
    'actor', case when g.actor_key is not null then (
      select jsonb_build_object('handle', a.handle, 'name', coalesce(a.name, a.handle), 'avatar_url', a.avatar_url)
      from public.profiles a where a.key = g.actor_key) end,
    'quest', case when g.trip_key is not null then (
      select jsonb_build_object('key', t.key, 'title', coalesce(t.title, 'your Quest'),
        'path', '/@' || owner.handle || '/' || t.slug,
        'cover_photo_key', coalesce(t.cover_photo_key::text, t.photos -> 0 ->> 'id'),
        'photo_folder', t.owner_key::text || '/' || t.key::text)
      from public.trips t join public.profiles owner on owner.key = t.owner_key where t.key = g.trip_key) end,
    -- Only a posted blog has a path; reactions need a posted blog, so this always holds.
    'blog', case when g.blog_key is not null then (
      select jsonb_build_object('key', b.key, 'title', coalesce(b.title, 'your blog'),
        'path', '/@' || owner.handle || '/blog/' || b.slug,
        'cover_photo_key', b.photos -> 0 ->> 'id',
        'photo_folder', b.owner_key::text || '/' || b.key::text)
      from public.blogs b join public.profiles owner on owner.key = b.owner_key
      where b.key = g.blog_key and b.slug is not null) end,
    'comment_excerpt', coalesce(
      (select left(c.body, 80) from public.comments c where c.key = g.comment_key),
      (select left(c.body, 80) from public.blog_comments c where c.key = g.comment_key))
  )) order by g.saved_at desc, g.key desc), '[]'::jsonb)
  from page g, me;
$$;

-- 12. Deleting a blog (migration 16 definition) now deletes its notifications, likes and comments
--     first (live and archived), then the blog rows, in one transaction.
create or replace function public.delete_blog(p_key uuid) returns jsonb
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

  delete from public.notifications where blog_key = p_key;
  delete from public.blog_likes_archive where blog_key = p_key;
  delete from public.blog_likes where blog_key = p_key;
  delete from public.blog_comments_archive where blog_key = p_key;
  delete from public.blog_comments where blog_key = p_key;
  delete from public.blog_drafts_archive where key = p_key;
  delete from public.blog_drafts where key = p_key;
  delete from public.blogs_archive where key = p_key;
  delete from public.blogs where key = p_key;
  return jsonb_build_object('handles', to_jsonb(handles), 'slug', blog.slug);
end $$;

-- 13. Account deletion (migration 16 definition): + blog likes and comments, theirs on anyone's
--     blogs and anyone's on theirs, and the notifications about their blogs. Returns
--     liked_or_commented_blog_keys in addition. Blog tombstones are kept, as before.
create or replace function public.delete_account_data(p_user_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  now_ts        timestamptz := clock_timestamp();
  handles       text[];
  own_trips     jsonb;
  own_blogs     jsonb;
  touched       uuid[];
  touched_blogs uuid[];
  follow_keys   uuid[];
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
  select coalesce(array_agg(distinct blog_key), '{}') into touched_blogs from (
    select blog_key from public.blog_likes where user_key = p_user_key
    union select blog_key from public.blog_comments where author_key = p_user_key) mine
    where blog_key not in (select key from public.blogs where owner_key = p_user_key);
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

  -- Reactions on their Quests and blogs, and theirs on anyone's.
  delete from public.notifications where recipient_key = p_user_key or actor_key = p_user_key
    or saved_by = p_user_key -- like notifications name nobody, but record who caused them
    or trip_key in (select key from public.trips where owner_key = p_user_key)
    or blog_key in (select key from public.blogs where owner_key = p_user_key);
  delete from public.likes_archive where user_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.likes where user_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.comments_archive where author_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.comments where author_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.blog_likes_archive where user_key = p_user_key
    or blog_key in (select key from public.blogs where owner_key = p_user_key);
  delete from public.blog_likes where user_key = p_user_key
    or blog_key in (select key from public.blogs where owner_key = p_user_key);
  delete from public.blog_comments_archive where author_key = p_user_key
    or blog_key in (select key from public.blogs where owner_key = p_user_key);
  delete from public.blog_comments where author_key = p_user_key
    or blog_key in (select key from public.blogs where owner_key = p_user_key);
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
    'liked_or_commented_blog_keys', to_jsonb(touched_blogs),
    'follow_profile_keys', to_jsonb(follow_keys),
    'own_trips', own_trips,
    'own_blogs', own_blogs,
    'handles', to_jsonb(handles));
end $$;

-- Deletions to finish (migration 16 definition): + blog likes and comments left behind.
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
     or exists (select 1 from public.blog_drafts b where b.owner_key = d.key)
     or exists (select 1 from public.blog_likes l where l.user_key = d.key)
     or exists (select 1 from public.blog_comments c where c.author_key = d.key);
$$;

-- 14. Weekly cleanup (migration 16 definition) gains the blog like and comment archives, 90 days
--     like the Quest ones (decision 0001 amendment 1).
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
  delete from public.blog_likes_archive where archived_at < p_now - interval '90 days';
  delete from public.blog_comments_archive where archived_at < p_now - interval '90 days';
  -- Only finished deletions: never a marker whose user still has an auth row or data.
  delete from public.deleted_accounts d
  where d.saved_at < p_now - interval '30 days'
    and not (d.key = any (public.list_pending_deletions()));
end $$;

-- 15. Grants (migration 11: nothing is callable unless granted here). Replaced functions keep
--     their grants: post_comment, list_my_notifications and delete_blog (authenticated);
--     search_public, get_profile and list_sitemap_profiles (anon, authenticated);
--     delete_account_data, list_pending_deletions and run_retention_cleanup (service_role).
grant execute on function public.get_blog_social(uuid), public.list_explore_blogs(int) to anon, authenticated;
grant execute on function public.set_blog_like(uuid, boolean), public.post_blog_comment(uuid, text),
  public.delete_blog_comment(uuid), public.get_my_blog_state(uuid), public.list_my_blogs(),
  public.list_my_comment_blog_keys(), public.list_home_feed(timestamptz, int, int) to authenticated;
