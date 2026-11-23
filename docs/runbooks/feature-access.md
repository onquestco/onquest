# Runbook: feature access (who may write blogs)

**Rule: no production `grant_feature_access` until BL-05 is live in production. The CTO makes the first production grant.**
A grant before then puts blog items in followers' feeds and bells before those screens can show them (blogs spec §3.9). Until BL-05 is live, test BL-03 and BL-04 on the Vercel preview against the Supabase **preview** project, with grants made there only.

The `feature_access` table (migration 16) decides who can start a new blog. Editing, managing and deleting your own blogs, and reading, liking and commenting on anyone's, are never gated. Nothing here needs a deploy: changes apply on the next page load.

Run these in the Supabase SQL editor of the right project (it runs as an admin role; the app's roles can't call these functions).

## Grant

```sql
-- One person, by their current handle (step 1: each founder; step 2: each friends-test user).
select public.grant_feature_access('blogs', 'riya');

-- Everyone (step 3, later).
select public.grant_feature_access('blogs', null);
```

Granting twice changes nothing. An unknown handle fails with "no such handle".

## Revoke

```sql
select public.revoke_feature_access('blogs', 'riya');   -- one person
select public.revoke_feature_access('blogs', null);     -- the "everyone" grant only; per-person grants stay
```

Revoking archives the row (`feature_access_archive`, kept 180 days). Blogs already written stay; the person just can't start a new one.

## Check who has access

```sql
select f.feature, coalesce(p.handle, '(everyone)') as who, f.saved_at
from public.feature_access f
left join public.profiles p on p.key = f.user_key
order by f.saved_at;

-- History of grants that were revoked.
select a.feature, coalesce(p.handle, '(everyone)') as who, a.saved_at as granted, a.archived_at as revoked
from public.feature_access_archive a
left join public.profiles p on p.key = a.user_key
order by a.archived_at desc;
```

A deleted account's grants are removed with the account (`delete_account_data`).
