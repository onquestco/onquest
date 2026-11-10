-- Feed, suggestions, trending, place chips, travellers to follow and search (spec C §3.4, §3.5).
-- Read-only: no tables, every function returns cards from quest_card_json (migration 12).
-- Error codes: OQ422 invalid (search text length).

-- 1. Ranking, decided by the founder (9 Nov): likes, then comments, then how new, combined.
--    points / (hours + 6)^1.2. Tuning is one migration (CTO C-C1).
create function public.quest_score(p_likes bigint, p_comments bigint, p_published_at timestamptz,
  p_now timestamptz) returns double precision
language sql immutable set search_path = '' as $$
  select (p_likes + 0.5 * p_comments + 1)
    / power(greatest(extract(epoch from (p_now - p_published_at)) / 3600, 0) + 6, 1.2);
$$;

-- Public published Quests with their counts and score at p_now. Comments off counts no comments.
create function public.public_quests_scored(p_now timestamptz)
returns table (trip public.trips, like_count bigint, comment_count bigint, score double precision)
language sql stable set search_path = '' as $$
  select t, counts.likes, counts.comments,
    public.quest_score(counts.likes, counts.comments, t.published_at, p_now)
  from public.trips t,
    lateral (select
      (select count(*) from public.likes l where l.trip_key = t.key) as likes,
      case when t.comments_on then (select count(*) from public.comments c where c.trip_key = t.key)
        else 0 end as comments) counts
  where t.status = 'published' and t.visibility = 'public' and t.published_at <= p_now;
$$;

-- 2. Home feed: Quests from people I follow. p_now is fixed by the first page, so the order
--    doesn't move between pages (except through new likes).
create function public.list_feed(p_now timestamptz, p_limit int default 10, p_offset int default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.quest_card_json(s.trip) || jsonb_build_object(
      'liked_by_me', exists (select 1 from public.likes l where l.trip_key = (s.trip).key and l.user_key = auth.uid()))
    order by s.score desc, (s.trip).key), '[]'::jsonb)
  from (
    select * from public.public_quests_scored(least(coalesce(p_now, now()), now())) q
    where exists (select 1 from public.follows f
                  where f.follower_key = auth.uid() and f.followee_key = (q.trip).owner_key)
    order by q.score desc, (q.trip).key
    limit least(greatest(coalesce(p_limit, 10), 1), 20) offset greatest(coalesce(p_offset, 0), 0)
  ) s;
$$;

-- Suggested for you: people I don't follow, not me. The last 30 days by score first, then older.
create function public.list_suggested_quests(p_limit int default 6)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.quest_card_json(s.trip) order by s.recent desc, s.score desc, (s.trip).key),
    '[]'::jsonb)
  from (
    select q.*, (q.trip).published_at >= now() - interval '30 days' as recent
    from public.public_quests_scored(now()) q
    where (q.trip).owner_key is distinct from auth.uid()
      and not exists (select 1 from public.follows f
                      where f.follower_key = auth.uid() and f.followee_key = (q.trip).owner_key)
    order by recent desc, q.score desc, (q.trip).key
    limit least(greatest(coalesce(p_limit, 6), 1), 10)
  ) s;
$$;

-- Trending (Explore): all public Quests of the last 14 days, by score.
create function public.list_trending_quests(p_limit int default 12)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.quest_card_json(s.trip) order by s.score desc, (s.trip).key), '[]'::jsonb)
  from (
    select * from public.public_quests_scored(now()) q
    where (q.trip).published_at >= now() - interval '14 days'
    order by q.score desc, (q.trip).key
    limit least(greatest(coalesce(p_limit, 12), 1), 12)
  ) s;
$$;

-- Place chips: the most common towns across public Quests (each Quest counts once per town).
create function public.list_place_chips(p_limit int default 8)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(town order by quests desc, town), '{}') from (
    select coalesce(place ->> 'city', place ->> 'name') as town, count(distinct t.key) as quests
    from public.trips t, jsonb_array_elements(t.places) as place
    where t.status = 'published' and t.visibility = 'public'
      and coalesce(place ->> 'city', place ->> 'name') is not null
    group by 1
    order by quests desc, town
    limit least(greatest(coalesce(p_limit, 8), 1), 12)
  ) towns;
$$;

-- Travellers to follow: people with a public Quest whom I don't follow, by likes on those Quests.
create function public.list_travellers_to_follow(p_limit int default 6)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.person_json(p) order by r.likes desc, r.latest desc, p.key), '[]'::jsonb)
  from (
    select t.owner_key,
      (select count(*) from public.likes l join public.trips lt on lt.key = l.trip_key
       where lt.owner_key = t.owner_key and lt.status = 'published' and lt.visibility = 'public') as likes,
      max(t.published_at) as latest
    from public.trips t
    where t.status = 'published' and t.visibility = 'public'
      and t.owner_key is distinct from auth.uid()
      and not exists (select 1 from public.follows f
                      where f.follower_key = auth.uid() and f.followee_key = t.owner_key)
    group by t.owner_key
    order by likes desc, latest desc, t.owner_key
    limit least(greatest(coalesce(p_limit, 6), 1), 10)
  ) r
  join public.profiles p on p.key = r.owner_key;
$$;

-- 3. Search (spec C §3.5): public published Quests and people. Contains-match always; trigram
--    similarity as well where pg_trgm is installed (Supabase), ordered by it. Unlisted, private
--    and draft Quests are never searched.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute 'create index profiles_search on public.profiles
      using gin (lower(concat_ws('' '', handle, name, home_city)) extensions.gin_trgm_ops)';
  end if;
end $$;

create function public.search_public(p_query text, p_limit int default 10)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  query     text := lower(trim(p_query));
  pattern   text;
  max_rows  int := least(greatest(coalesce(p_limit, 10), 1), 10);
  trigram   boolean := exists (select 1 from pg_extension where extname = 'pg_trgm');
  quests    jsonb;
  people    jsonb;
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
        select p, extensions.similarity(lower(concat_ws(' ', p.handle, p.name, p.home_city)), $1) as rank
        from public.profiles p
        where lower(concat_ws(' ', p.handle, p.name, p.home_city)) ilike $2
           or extensions.similarity(lower(concat_ws(' ', p.handle, p.name, p.home_city)), $1) > 0.3
        order by rank desc, p.handle limit $3) s
    $q$ into people using query, pattern, max_rows;
  else
    select coalesce(jsonb_agg(public.quest_card_json(s.trip) order by s.score desc), '[]'::jsonb) into quests
    from (select q.trip, q.score from public.public_quests_scored(now()) q
          where (q.trip).search_text ilike pattern order by q.score desc limit max_rows) s;
    select coalesce(jsonb_agg(public.person_json(s.p) order by (s.p).handle), '[]'::jsonb) into people
    from (select p from public.profiles p
          where lower(concat_ws(' ', p.handle, p.name, p.home_city)) ilike pattern
          order by p.handle limit max_rows) s;
  end if;
  return jsonb_build_object('quests', quests, 'people', people);
end $$;

-- 4. Grants (migration 11: nothing is callable unless granted). quest_score and
--    public_quests_scored are internal.
grant execute on function public.list_trending_quests(int), public.list_place_chips(int),
  public.search_public(text, int) to anon, authenticated;
grant execute on function public.list_feed(timestamptz, int, int), public.list_suggested_quests(int),
  public.list_travellers_to_follow(int) to authenticated;
