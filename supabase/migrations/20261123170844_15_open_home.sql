-- 15. Home and Explore open to signed-out visitors (OQ-16, approved by Swati 23 Nov 2026).
-- Grants only. Both functions already return public, published Quests and people with a public
-- Quest; signed out, auth.uid() is null, so "not mine" and "not followed" leave everything in.
grant execute on function public.list_suggested_quests(int), public.list_travellers_to_follow(int)
  to anon;
