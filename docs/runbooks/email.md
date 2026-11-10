# Runbook: notification emails (Resend)

Spec B §3.5. Do this on **preview first, then production**.

## 1. Resend account and domain

1. Create the Resend account (free plan: 100 emails a day, shared by notifications **and** sign-in links).
2. **Domains → Add domain** `onquest.in`. Resend shows DNS records: an SPF `TXT`, DKIM `CNAME`/`TXT`
   records and an optional return-path `MX`. Add them at the DNS host (Hostinger), then **Verify**.
3. Add a **DMARC** record if there isn't one: `TXT` on `_dmarc.onquest.in`, value
   `v=DMARC1; p=none; rua=mailto:<CTO's address>` (start with `p=none`, tighten later).
4. **API Keys → Create**, permission "Sending access", domain `onquest.in`. The key goes straight into
   Vercel (step 3). Never paste it into code, chat or a ticket.

## 2. Supabase Auth uses the same sender (F-A8)

Supabase → **Authentication → Emails → SMTP Settings**: enable custom SMTP with Resend's SMTP details
(host `smtp.resend.com`, port 465, user `resend`, password = a Resend API key), sender
`OnQuest <signin@onquest.in>`. Supabase's built-in sender is rate-limited too hard for real users.
The email templates themselves are in `docs/runbooks/auth.md`.

## 3. Environment variables (Vercel → Settings → Environment Variables)

| Name | Value | Environments |
|---|---|---|
| `RESEND_API_KEY` | the key from step 1.4 | Production, Preview |
| `NOTIFY_EMAIL_DAILY_BUDGET` | `70` | Production, Preview |
| `EMAIL_LINK_SECRET` | `v1:` + 32+ random characters (`openssl rand -hex 32`) | Production, Preview (different values) |
| `SUPABASE_SECRET_KEY` | already set (A-05) | Production, Preview |

Rotating `EMAIL_LINK_SECRET`: append `,v2:<new random>` and keep `v1` for a few months, so stop links
in old emails keep working. New emails sign with the last one listed.

## 4. Check it

1. Comment on someone else's Quest → the owner gets "{name} commented on {title}: …" within a minute,
   with a working "Open your Quest" link (ends `?n=email`) and a stop link.
2. Tap the stop link → one-button page → "Done". Settings shows that switch off; a new comment shows in
   the bell but sends no email.
3. Gmail shows an "Unsubscribe" button next to the sender (the `List-Unsubscribe` header works).
4. Like then unlike then like again from the same account → one email only.

## 5. When the budget runs out

After 70 notification emails in a UTC day, emails stop until the next UTC day; the bell keeps working,
and the server logs "Notification email budget reached for today" once that day. At the first one in the
friends test, upgrade Resend to Pro and raise `NOTIFY_EMAIL_DAILY_BUDGET`. (B-06 note: Resend's own
daily limit resets on a UTC day boundary per their docs at the time of writing; check the dashboard's
usage page if emails stop earlier than expected.)
