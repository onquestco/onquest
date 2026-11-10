# Runbook: sign-in setup (Supabase Auth)

Spec A §3.8. Do this on **preview first, then production**, before the A-06 code is deployed.
Supabase dashboard → the project → **Authentication**.

## 1. Redirect URLs

**URL Configuration**:

- **Site URL**: `https://onquest.in` (production) or the preview domain (preview).
- **Redirect URLs**: add all of these:
  - `https://onquest.in/auth/callback**`
  - `https://onquest.in/auth/confirm**`
  - `https://*-onquest.vercel.app/auth/callback**` (preview deployments; use the project's real preview pattern)
  - `https://*-onquest.vercel.app/auth/confirm**`
  - `http://localhost:3000/auth/callback**` and `http://localhost:3000/auth/confirm**` (local only; not on production)

The `**` matters: the links carry `?next=…&intent=…&ref=…`, and without it Supabase sends people to the Site URL instead.

## 2. Email templates

**Email Templates**: the **Magic Link** and **Confirm signup** templates must link to our
`/auth/confirm` route with a token hash, **not** `{{ .ConfirmationURL }}`. A PKCE link only works in the
browser that asked for it; a link requested inside Instagram opens in Safari or Chrome from the mail app.

`emailRedirectTo` already contains `?next=…`, so the template adds the token with `&`.

**Magic Link**, subject `Your OnQuest sign-in link`:

```html
<h2>Sign in to OnQuest</h2>
<p>Tap the link below to sign in. It works once and expires in an hour.</p>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in to OnQuest</a></p>
<p>If you didn't ask for this, you can ignore this email.</p>
```

**Confirm signup**, subject `Welcome to OnQuest`:

```html
<h2>Welcome to OnQuest</h2>
<p>Tap the link below to finish signing in. It works once and expires in an hour.</p>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in to OnQuest</a></p>
<p>If you didn't ask for this, you can ignore this email.</p>
```

For local development the same templates go in `supabase/config.toml` (`[auth.email.template.magic_link]`
and `[auth.email.template.confirmation]`, `content_path` pointing at an HTML file) when we need to test
email sign-in locally. Inbucket (`http://localhost:54324`) shows the emails.

## 3. Google provider

**Providers → Google**: enabled, with the Google Cloud OAuth client id and secret (the CTO holds them;
never paste them into code or chat). The Google client's **Authorized redirect URI** is the one Supabase
shows on that page (`https://<project-ref>.supabase.co/auth/v1/callback`), not ours.

## 4. Check it

1. Signed out, open a public Quest, tap the heart → sign in with Google → you're back on the same Quest
   and the URL ends `?intent=like`.
2. Same with "Add a comment" using **Email me a sign-in link**: request it in one browser, open the email
   in another (or a private window) → you're signed in there and back on the Quest with `?intent=comment`.
3. A first-time account goes through "Pick a username" first, then back to the Quest (no welcome screens).
4. Open an old link a second time → "That link has expired. Send a new one."
5. `/login?next=https://example.com` → after sign-in you land on `/home`, not example.com.

Later, when Resend becomes the Auth SMTP (F-A8), the sender changes; the templates above stay.
