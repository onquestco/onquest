# Runbook: analytics erasure on account deletion

Spec `docs/specs/analytics-v2.md` §5.2 (AN-04), decision 0004 §6. Code: `lib/analytics/erasure.ts`,
called from `deleteAccount()` (`features/account/accountDeletion.ts`) and the daily cron
`app/api/cron/finish-deletions` (02:00 UTC, `vercel.json`).

## 1. What happens when someone deletes their account

After the database delete succeeds:

1. **`account_deleted`** is sent to PostHog under a fresh `deleted_<uuid>` distinct id, with
   `user_id` = the key and counts only (`quest_count`, `blog_count`, `follower_count`,
   `days_since_signup`); `anon_id`, `session_id` and `user_info` are null. It is never erased, so
   deletions can still be counted. A repeat run (auth user already gone) doesn't send it again.
2. **PostHog**: the person found by the user key, and the anon ids merged into it, are deleted, and
   their events are queued for deletion (§3).
3. **BigQuery**: one script (§4) remembers the key in `deleted_users` and the device ids in
   `deleted_devices`, then deletes the person's rows and their devices' signed-out rows, never
   another person's signed-in rows and never `account_deleted`.

Steps 2 and 3 are best effort: a failure is logged by error class or HTTP status only and never fails
the deletion. The cron repeats steps 2 and 3 every day for every `deleted_accounts` row saved in the
last 30 days. `events_clean` and the other views anti-join `deleted_users` / `deleted_devices`, so a
row that arrives after day 30 is still never read.

## 2. Set-up (CTO)

The code is inert until these are set: each store is `skipped` until all of its variables are set.
Never paste the keys into code, chat, an issue or a PR.

### 2.1 PostHog personal API key

PostHog → **Settings → Personal API keys → Create**: label `onquest-erasure`, **scope Person: Write
only**, restricted to the OnQuest project (the one shared by Preview and Production).

### 2.2 GCP service account `analytics-eraser`

In the project that holds `onquest_analytics` (replace `PROJECT`):

```bash
gcloud iam service-accounts create analytics-eraser --project=PROJECT \
  --display-name="OnQuest analytics erasure"
# Run DML jobs in the project (no data access by itself).
gcloud projects add-iam-policy-binding PROJECT \
  --member=serviceAccount:analytics-eraser@PROJECT.iam.gserviceaccount.com \
  --role=roles/bigquery.jobUser
```

Data access on **the dataset only** (BigQuery console query, or dataset → Sharing → Permissions):

```sql
GRANT `roles/bigquery.dataEditor` ON SCHEMA `PROJECT.onquest_analytics`
TO "serviceAccount:analytics-eraser@PROJECT.iam.gserviceaccount.com";
```

Minimal alternative: a custom role on the dataset with just `bigquery.tables.get`,
`bigquery.tables.getData` and `bigquery.tables.updateData` instead of `dataEditor` (which can also
create and delete tables). Either works with the code.

Key: `gcloud iam service-accounts keys create key.json --iam-account=analytics-eraser@PROJECT.iam.gserviceaccount.com`,
then `base64 -w0 key.json` (macOS: `base64 -i key.json`) into Vercel, then delete `key.json`. If the
organisation blocks key creation (`iam.disableServiceAccountKeyCreation`), that policy needs an
exception for this project.

### 2.3 Vercel environment variables (Production and Preview, same values)

| Name | Value |
|---|---|
| `POSTHOG_API_HOST` | `us.posthog.com` (or `eu.posthog.com`): the private API host, **not** `us.i.posthog.com` |
| `POSTHOG_PROJECT_ID` | the numeric project id (PostHog → Project settings) |
| `POSTHOG_PERSONAL_API_KEY` | the key from 2.1 (secret) |
| `BIGQUERY_ERASER_KEY` | base64 of the key JSON from 2.2 (secret) |
| `BIGQUERY_DATASET` | `onquest_analytics` |
| `BIGQUERY_LOCATION` | the dataset's location as shown in its details (e.g. `US`, `asia-south1`) |

All are read at runtime: no redeploy needed after setting them. The BigQuery project id comes from
the key's `project_id`.

## 3. PostHog request

```
POST https://{POSTHOG_API_HOST}/api/projects/{POSTHOG_PROJECT_ID}/persons/bulk_delete/
Authorization: Bearer {POSTHOG_PERSONAL_API_KEY}
{ "distinct_ids": ["<user key>"], "delete_events": true }
```

Any 2xx, or 404 (no such person), counts as done.

**Not yet verified against PostHog.** posthog.com and PostHog's source weren't reachable from the
build environment, so the endpoint, body and timing above come from the builder's knowledge of
PostHog's API reference: `bulk_delete` takes up to 1,000 `distinct_ids` (or person `ids`), deletes
the persons straight away, and with `delete_events: true` **queues** their events, which PostHog
removes in a periodic batch job (believed weekly), not at once. "Person gone" is therefore not
"events gone". G5 step 1 confirms the request; G5 records when the events actually went. Correct
this section with what G5 shows.

## 4. BigQuery script

One `jobs.query` call (`POST https://bigquery.googleapis.com/bigquery/v2/projects/{project}/queries`,
standard SQL, `location` = `BIGQUERY_LOCATION`, named parameter `@key`), authenticated with a token
from a service-account JWT signed in `node:crypto`. The script is `bigQueryErasureScript()` in
`lib/analytics/erasure.ts`, the same on every run; it is safe to repeat. If the job hasn't finished
in 20 s the code waits once more, then counts it as failed (the job may still finish; the next run
repeats it either way).

A DELETE can collide with an export load job, or hit rows still in a streaming buffer; both show up
as a failed run and are retried the next day.

## 5. Alerts and the manual step

The cron logs:

- `Analytics erasure pending: N`: N recent deletions where a store was `skipped` (env unset) or
  `failed`. Expected every day until §2 is done. Once it is, **the line on two days running needs a
  human**: look for `Analytics erasure failed (posthog|bigquery): <reason>` lines above it.
- `Account deletions still pending: N`: unrelated to analytics (spec C §3.9).

Manual step, for each affected key (find recent keys with the admin client or SQL:
`select key from deleted_accounts where saved_at > now() - interval '30 days'`):

1. **PostHog**: Persons → search the user key → **Delete person**, ticking "also delete events". Or
   the §3 request with `curl` and the personal key.
2. **BigQuery**: run the script with the key as a parameter:

   ```bash
   bq query --use_legacy_sql=false --location=LOCATION --parameter=key::USER_KEY < erasure.sql
   ```

   where `erasure.sql` is the script from `bigQueryErasureScript('PROJECT', 'onquest_analytics')`
   (the SQL in spec §5.2 with the project prefixed).

**Rollback past AN-04** stops automatic erasure: every deletion until roll-forward needs this manual
step (spec §8).

## 6. Proofs

### G5: Preview, shared PostHog project and `onquest_analytics` (before AN-04 merges)

Two team test accounts, A then B, signed in on one browser on the Preview deployment. Delete A.
Then, after the next cron run (or calling the cron with the `CRON_SECRET`):

| # | Check | How | Result |
|---|---|---|---|
| 1 | PostHog person A is gone | `GET https://{host}/api/projects/{id}/persons/?distinct_id=<keyA>` returns no result | Not yet run |
| 2 | No A rows in BigQuery | `SELECT COUNT(*) FROM onquest_analytics.events WHERE event != 'account_deleted' AND (distinct_id = @keyA OR JSON_VALUE(properties, '$.user_id') = @keyA)` = 0 | Not yet run |
| 3 | Markers written | `deleted_users` has keyA; `deleted_devices` has the shared `anon_id` with keyA | Not yet run |
| 4 | B untouched | B's signed-in rows on that `anon_id`: same count before and after | Not yet run |
| 5 | `account_deleted` kept | one row for keyA in `events_clean_all` with `env = 'preview'` | Not yet run |
| 6 | Production untouched | `env = 'production'` row count outside keyA and its devices unchanged | Not yet run |
| 7 | PostHog events gone | date A's events disappeared from PostHog (§3 timing) | Not yet run |

Run by: — · Date: — · Deployment: —

### G6: Production (before `ANALYTICS_USER_INFO=on` in Production)

The same checks with one team test account on Production.

Run by: — · Date: — · Result: Not yet run
