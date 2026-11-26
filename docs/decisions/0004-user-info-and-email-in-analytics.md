# 0004: user_info (geo, username, email) on analytics events

- **Status:** Proposed. CTO decision of 26 Nov 2026 as relayed in the analytics v2 brief (`docs/prds/2026-11-analytics-v2.md`); becomes Accepted when the CTO approves the spec PR "Spec: analytics v2 (OQ-12)".
- **Applies to:** every PostHog event and the BigQuery export (`onquest_analytics.events`, `events_clean`).
- **Overrides:** CLAUDE.md "Don't log user text, emails or photo URLs" (for this one case only), `docs/03-security-visibility-seo.md` §B.4 ("no … emails … in any event"), spec A §3.9 ("Identify with the user key only … never name, handle or email", "Never in any property: … handles, emails"), and the comment on `identify()` in `lib/analytics/client.ts`.

## Decision

1. Every event gets a top-level `user_info` property:
   ```json
   { "geoip": { "country": "IN", "region": "KA", "city": "Bengaluru" }, "username": "riya", "email_id": "riya@example.com" }
   ```
   It is `null` when the person is signed out, and `null` on `notification_sent` (whose `user_id` is the recipient) and `account_deleted`.
2. `user_info` is attached **only on our servers**: by the `/ingest` route handler for browser events and by `trackServer()` for server events, from the verified Supabase session (`auth.getUser()`) and the person's own profile, and only for that session's own user (`userInfoForSession(expectedKey)` returns null otherwise). `lib/analytics/userInfo.ts` is `import 'server-only'`. The browser never sends or holds `email_id`; anything the browser puts in `user_info` is overwritten. Identity (`distinct_id`, `user_id`, the anon → user merge) is also decided only on the server, so no one can file events under someone else's key.
3. Geo comes from Vercel's request headers (`x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city`), never finer than city. The raw IP is never forwarded to PostHog or stored; PostHog GeoIP is switched off per event (`$geoip_disable: true`).
4. `email_id` is plain text (not hashed), as decided. It is the only user-written or personal text allowed in analytics; every other property stays codes, counts, lengths and keys.
5. `ANALYTICS_USER_INFO` is `off` (default), `team` (only the OnQuest team's own keys; used on Preview) or `on`. Production turns it `on` only after (a) the privacy policy update below is live with its in-app notice, (b) analytics erasure (spec AN-04) is proved on Preview with Preview-scoped keys and then on Production with a team test account (spec gates G5, G6). The new analytics context cookie (`oq_actx`) waits for (a) too.
6. Account deletion erases the person's analytics: PostHog person + events through PostHog's API (events are deleted in the background), and in BigQuery the rows of their user key and of the device ids seen with it, re-run daily for 30 days, plus a key-only `deleted_users` table that `events_clean` anti-joins (documented manual fallback in `docs/runbooks/analytics-erasure.md`). The `account_deleted` event is sent under its own random distinct id with the user key and counts only (no anon/session id, no `user_info`) and is kept, so deletions can still be counted. Deleted rows leave BigQuery's time travel and fail-safe within about two weeks, so the policy says "within 30 days".
7. Preview sends to its own PostHog project and BigQuery dataset. `events_clean` (what the Metrics queries read) has no email; `events_people` (with `user_info`) is for the founders only.

## Why

The CTO wants to be able to see who did what (support, the friends test, cohort checks by hand) and where, without a join to the production database. Keeping enrichment on the server keeps emails out of the browser bundle, out of localStorage and out of client-side logs.

## Consequences

- CLAUDE.md's security rule becomes: "Don't log user text, emails or photo URLs. One exception: analytics `user_info` (username, email, city), attached on the server only and erased on account deletion (`docs/decisions/0004-user-info-and-email-in-analytics.md`)." The coordinator applies this line after the CTO approves (agents don't edit CLAUDE.md).
- The privacy policy (`features/legal/PrivacyPolicy.tsx`) must change before step 5 turns on: it currently says "We never record what you type, your email or your photo links in analytics" and "We tell our analytics provider to discard IP addresses". The new text must say analytics events include the email, username and approximate location (city) of signed-in people, that IP addresses are still not stored, that one first-party analytics cookie holds a random device and visit id, that Google Cloud (BigQuery) is a processor next to PostHog, and that deleting the account deletes them within 30 days. The policy's own "Changes" section requires an in-app notice before a change that matters applies. **Founder to write and approve.**
- PostHog and BigQuery now hold personal data; access to both stays limited to the founders. DPDP Act: covered by notice + deletion; get the short legal review already planned before public launch.
- Anyone who can read the raw `events` table or `events_people` can read emails. Keep both founders-only; share `events_clean` or aggregates.
