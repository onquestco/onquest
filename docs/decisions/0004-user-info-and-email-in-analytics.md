# 0004: user_info (geo, username, email) on analytics events

- **Status:** Proposed. CTO decision of 26 Nov 2026 as relayed in the analytics v2 brief (`docs/prds/2026-11-analytics-v2.md`); becomes Accepted when the CTO approves the spec PR "Spec: analytics v2 (OQ-12)".
- **Applies to:** every PostHog event and the BigQuery export (`onquest_analytics.events`, `events_clean`).
- **Overrides:** CLAUDE.md "Don't log user text, emails or photo URLs" (for this one case only), `docs/03-security-visibility-seo.md` §B.4 ("no … emails … in any event"), spec A §3.9 ("Identify with the user key only … never name, handle or email", "Never in any property: … handles, emails"), and the comment on `identify()` in `lib/analytics/client.ts`.

## Decision

1. Every event gets a top-level `user_info` property:
   ```json
   { "geoip": { "country": "IN", "region": "KA", "city": "Bengaluru" }, "username": "riya", "email_id": "riya@example.com" }
   ```
   It is `null` when the person is signed out, and `null` on events the server sends about someone else (`notification_sent`, whose `user_id` is the recipient).
2. `user_info` is attached **only on our servers**: by the `/ingest` route handler for browser events and by `trackServer()` for server events, from the verified Supabase session (`auth.getUser()`) and the person's own profile. The browser never sends or holds `email_id`; anything the browser puts in `user_info` is overwritten.
3. Geo comes from Vercel's request headers (`x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city`), never finer than city. The raw IP is never forwarded to PostHog or stored; PostHog GeoIP is switched off per event (`$geoip_disable: true`).
4. `email_id` is plain text (not hashed), as decided. It is the only user-written or personal text allowed in analytics; every other property stays codes, counts, lengths and keys.
5. `user_info` is switched on by the server env var `ANALYTICS_USER_INFO=on` only after (a) the privacy policy update below is live with its in-app notice, and (b) analytics erasure on account deletion (spec AN-03) is in production. Until then it is always `null`.
6. Account deletion erases the person's analytics: PostHog person + events through PostHog's API, and the rows in BigQuery `onquest_analytics.events` where `user_id` is theirs (automated delete job, with a documented manual fallback in `docs/runbooks/analytics-erasure.md`). The `account_deleted` event itself is sent with `user_info: null` and is kept, so deletions can still be counted.

## Why

The CTO wants to be able to see who did what (support, the friends test, cohort checks by hand) and where, without a join to the production database. Keeping enrichment on the server keeps emails out of the browser bundle, out of localStorage and out of client-side logs.

## Consequences

- CLAUDE.md's security rule becomes: "Don't log user text, emails or photo URLs. One exception: analytics `user_info.email_id`, attached on the server only (decision 0004)." The CTO applies this line on the spec PR (agents don't edit CLAUDE.md).
- The privacy policy (`features/legal/PrivacyPolicy.tsx`) must change before step 5 turns on: it currently says "We never record what you type, your email or your photo links in analytics" and "We tell our analytics provider to discard IP addresses". The new text must say analytics events include the email, username and approximate location (city) of signed-in people, that IP addresses are still not stored, and that deleting the account deletes them. The policy's own "Changes" section requires an in-app notice before a change that matters applies. **Founder to write and approve.**
- PostHog and BigQuery now hold personal data; access to both stays limited to the founders. DPDP Act: covered by notice + deletion; get the short legal review already planned before public launch.
- Anyone who can read the BigQuery dataset can read emails. Don't share `events` or `events_clean` outside the founders; share aggregates only.
