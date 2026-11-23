# Runbook: applying database migrations

Migrations live in `supabase/migrations/` and are applied by hand, before the code that needs them is deployed (blogs spec §8). Each one is additive first (expand → contract), so the code already in production keeps working while it runs and after it.

## Steps

1. **The builder names the migration in the PR** (for example `20261123194231_16_blogs.sql`), with the deploy order and anything risky to look at. CI runs every migration on the seed in PGlite (`tests/db/`).
2. **The CTO approves the PR.** Nothing is merged yet.
3. **Preview first.** Link the Supabase CLI to the preview project and push:
   ```bash
   supabase link --project-ref <preview project ref>
   supabase db push            # applies only migrations the project hasn't had
   ```
   Check the preview app (Vercel preview of the PR) and the Supabase security advisor.
4. **Then production**, the same way with the production project ref. Check the advisor again.
5. **Merge the PR.** The code deploys after the merge, so production always has the migration before the code that calls it.

Never edit a migration that is already on `main`; add a new one.

## Rollback

Roll forward only (blogs spec R4). Migrations are additive, so the previous release keeps working on the new schema; if code has to go back, the migration stays. A fix is a new migration.
