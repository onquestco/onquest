-- Access rules. Owners can do everything with their own rows; nobody else can read tables
-- directly. Public pages read through the functions in the next migration.

alter table public.profiles enable row level security;
alter table public.trips    enable row level security;
alter table public.photos   enable row level security;
alter table public.places   enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "own trips" on public.trips for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own photos" on public.photos for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = (select auth.uid()))
  );

create policy "own places" on public.places for all to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = (select auth.uid())));
