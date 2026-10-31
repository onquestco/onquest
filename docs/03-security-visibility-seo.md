# OnQuest: Security, Visibility, SEO and AEO (lean v1)

Companion to `01-hld.md` and `02-lld.md`. Part A: who can see what. Part B: keeping it that way. Parts C–D: getting found. Part E: launch checklist. Each part ends with what's deliberately left for later.

---

## Part A: Visibility

### A.1 Who sees what

| | Public | Unlisted | Private | Draft |
|---|---|---|---|---|
| URL | `/@swati/goa-2026` | `/@swati/goa-2026-k3f9x2` (random 6-char suffix) | none | none |
| Owner | ✓ | ✓ | ✓ at `/trips/[id]/preview` | ✓ in editor |
| Anyone with the link | ✓ | ✓ | 404 | 404 |
| On profile, profile map, stats | ✓ | ✗ | ✗ | ✗ |
| Search engines | ✓ if ≥ 80 words of text, else `noindex` | `noindex` | — | — |
| WhatsApp/IG link preview | ✓ | ✓ | — | — |

- **New trips default to Unlisted.** The publish screen explains the three options in one line each.
- **Why the suffix:** without it `/@swati/goa-2026` is guessable. 36⁶ ≈ 2 billion combinations makes guessing impractical.
- **Public → Unlisted** gives the trip a new suffixed URL; the old one 404s, so it can't lead anyone to the new link.
- **Unlisted → Public** keeps the same URL.
- **Profiles** are always public. A profile with no public trips is `noindex`.

### A.2 Photos: the one honest trade-off

Display photos live in a **public** bucket under random UUID paths. They're never listed anywhere, but anyone who already has a photo's exact URL can open it.

- Making a trip **private** hides the page and removes it from the profile. Photo URLs that someone already saw keep working.
- **Deleting** a trip removes the files, so the URLs stop working.
- UI copy on the Private option: "Hides this trip. To remove photos completely, delete the trip."
- High-res export files are in a **private** bucket (owner only).

Later: a private bucket with signed URLs for private trips (all storage code is in `lib/storage.ts`, so it's a contained change).

---

## Part B: Security

### B.1 What we protect against

| Risk | Control |
|---|---|
| Someone lists or reads other people's trips via the Supabase API | RLS: owner-only tables, **no** anonymous table access. Public pages read through 3 database functions that return only published public/unlisted data. Automated tests |
| Photo GPS reveals where someone lives | Photos are re-encoded on the phone (removes all EXIF). GPS is never stored. Automated test |
| Malicious text in titles/stories (XSS) | React escaping; never `dangerouslySetInnerHTML` with user text; zod length limits; JSON-LD `<` escaped |
| Account takeover | Supabase Auth (Google + magic link), httpOnly cookies, server checks with `getUser()` |
| Secret key leak | Secret key only in Production env vars, only imported in `lib/supabase/admin.ts` (marked `server-only`) |
| Surprise bills | Bucket size/type limits, 80 photos per trip, quotas set in the geocoder + MapTiler consoles, keys restricted to our domain, Supabase spend cap on |
| Abuse (someone else's photos, explicit content) | "Report" mailto link in every trip footer; founders unpublish within 48 h |

### B.2 Rules for the code

1. Every table has RLS on. Policies are owner-only.
2. Public data comes only from `get_trip`, `get_profile`, `list_sitemap_trips`.
3. All writes go through server actions using `lib/action.ts` (zod + signed-in check).
4. Server code uses `supabase.auth.getUser()`, not `getSession()`, to decide who the user is.
5. Browser uses the **publishable** key; server admin tasks use the **secret** key. Don't use the legacy anon/service_role keys (retiring end of 2026).
6. Handles: `[a-z0-9_]{3,20}`, plus a reserved list in code (`admin, api, app, login, settings, new, trips, demo, help, about, terms, privacy, u, www, onquest`, …).
7. Uploads: only `image/webp` / `image/jpeg`, 5 MB (photos) / 8 MB (exports), users can only write inside their own folder.
8. Never log user text, photo URLs or emails to Sentry (`beforeSend` scrubber).

### B.3 HTTP headers (`next.config.ts`)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin     (unlisted URLs aren't sent to map/analytics hosts)
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://*.posthog.com;
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://<project>.supabase.co https://api.maptiler.com;
  connect-src 'self' https://<project>.supabase.co https://api.maptiler.com https://*.posthog.com https://*.sentry.io;
  font-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'
```

CSP stays report-only during the friends test, then gets enforced once the reports are clean.

### B.4 Accounts, privacy and legal basics

- Delete account (in Settings) removes all trips, files and the login.
- Simple **Terms** and **Privacy** pages before the friends test: users own their photos and let us display them; minimum age **18**; what we collect; the services we use (Supabase, Vercel, PostHog, Sentry, MapTiler, geocoder, Resend); how to delete; a contact email for complaints.
- India's **DPDP Act 2023** applies to Indian users (its Rules are being phased in). Notice at signup, working deletion, and a grievance contact cover the basics. Setting the minimum age at 18 avoids the parental-consent requirements for children. *Not legal advice; get a short review before a public launch.*
- PostHog in cookieless mode (no consent banner needed for the friends test).
- MFA on all founder accounts (Supabase, Vercel, GitHub, Google, domain registrar). GitHub secret scanning + Dependabot on.

**Later:** rate limiting and CAPTCHA (add when abuse shows up), a report form instead of mailto, nonce-based CSP on app pages.

---

## Part C: SEO

### C.1 What gets indexed

| Page | Index? |
|---|---|
| `/`, `/demo` | ✓ |
| `/@handle` with ≥ 1 public trip | ✓ |
| Public trip with ≥ 80 words | ✓ |
| Public trip with < 80 words, empty profiles | `noindex, follow` (thin pages hurt the whole site) |
| Unlisted trips | `noindex, nofollow` |
| App pages (`/trips/*`, `/new`, `/login`, `/settings`, `/onboarding`) | `noindex` + disallowed in robots |

### C.2 Must-haves

- **Text in the HTML.** Titles, stories, place notes and captions are server-rendered, not added by JavaScript. Check with "view source".
- **Headings:** `<h1>` = trip title; `<h2>` = "Where I went", "Day by day", "Stayed with me"; `<h3>` per day ("Day 2: Chasing the Northern Coast") and per place. Stories in `<p>` inside `<article>`. Dates in `<time>`. Author name links to `/@handle`.
- **Metadata** (`generateMetadata`):
  - title: `{Trip title}: {short title} by {name} | OnQuest` (trim to ~60 chars)
  - description: start of the note, else day 1 story, else "{N} days in {destination}: {places}" (~155 chars)
  - canonical: absolute `/@handle/slug`
  - Open Graph (`article`, published time, author) + Twitter `summary_large_image`
- **`robots.ts`** and **`sitemap.ts`** (landing, demo, profiles with public trips, `list_sitemap_trips()`).
- **One URL per page:** one host (redirect `www` or non-`www`), lowercase, no trailing slash.
- **Images:** `alt` from caption, else "{place}, day {n}"; width/height always set; lazy below the first screen; `priority` on the first photo.
- **Speed (Core Web Vitals):** LCP < 2.5 s, INP < 200 ms, CLS < 0.1. Watch with Vercel Speed Insights.
- **Real 404s** for missing/private trips.
- **Google Search Console** and **Bing Webmaster Tools** set up at launch, sitemap submitted to both.

### C.3 Structured data (JSON-LD)

Standard schema.org, generated in `features/trip-page/jsonLd.ts`:

- **Trip page:** `BlogPosting` with `headline`, `datePublished`, `dateModified`, `image`, `author` (`Person` + profile URL), `contentLocation` (`Place`, destination), and `about` → `Trip` with an `itinerary` list of `TouristAttraction`s (name + geo).
- **Profile:** `ProfilePage` with `mainEntity: Person` (name, `@handle` as `alternateName`, image, description).
- **Landing:** `WebSite` + `Organization`.
- **All:** `BreadcrumbList` (Home → @swati → My Goa Trip).

Serialize with `JSON.stringify(data).replace(/</g, '\\u003c')`. Validate with Google's Rich Results Test before launch.

### C.4 Link previews (WhatsApp, Instagram DMs, iMessage)

- `og:image` 1200×630, absolute URL, **under ~300 KB** (WhatsApp often skips bigger images), plus `og:image:alt`.
- Unlisted trips still get previews (`noindex` doesn't affect them).
- Test by actually sending links on WhatsApp and Instagram, and with the Facebook Sharing Debugger.

**Later:** IndexNow pings, image sitemap, "everyone's trips to Goa" place pages.

---

## Part D: AEO (AI search: Google AI Overviews / AI Mode, ChatGPT, Perplexity, Copilot, Claude)

### D.1 What actually matters

Google's May 2026 guidance on AI search features says they run on normal Search ranking. There are no special AI tricks: llms.txt, "chunking", AI-specific rewrites and AI-only schema don't help with Google. Good SEO plus **first-hand experience** does, and trip pages are first-hand experience by nature.

So for AEO, do Part C well, plus:

1. **Prompt for specific, first-hand detail** (all optional): a one-line tip per place ("walk past the main stretch to the stairs at the far end"), best time to go, how you got around. AI answers quote this kind of sentence.
2. **Make it easy to quote:** each place has a heading with a short note right under it. Facts (dates, number of days, place names) are plain text, not only inside images.
3. **Clear authorship:** visible name, profile link and date on every trip.
4. **Original photos with good alt text.**
5. **Get into Bing** (several AI assistants use Bing's index): Bing Webmaster Tools at launch.

### D.2 AI crawler policy (founder decision)

Recommended: allow AI **search** bots (they cite and send visitors), block AI **training** bots (users didn't sign up to train models). Say so in the Privacy page.

```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/trips/', '/new', '/settings', '/login', '/onboarding'] },
      { userAgent: ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'meta-externalagent'], disallow: '/' },
    ],
    sitemap: 'https://onquest.in/sitemap.xml',
  };
}
```

- AI search bots (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot) fall under `*` and are allowed.
- `Google-Extended` only controls Gemini training/grounding. It does **not** remove pages from AI Overviews.
- Crawler names change. Re-check vendor docs before launch.
- robots.txt is a polite request, not privacy. Unlisted pages are protected by `noindex` + unguessable URLs.

### D.3 Measuring it

PostHog referrers: `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`, `gemini.google.com`, `claude.ai`. Search Console + Bing Webmaster for queries.

**Later:** `/llms.txt` (cheap, may help non-Google assistants), auto "quick facts" box per trip.

---

## Part E: Launch checklist

**Visibility & privacy**
- [ ] Tests pass: logged-out client can't read any table; `get_trip` returns only published public/unlisted
- [ ] Unlisted URLs have a suffix; public → unlisted kills the old URL
- [ ] Profile/sitemap/map show public trips only
- [ ] Private trip → 404 for everyone except owner preview
- [ ] Uploaded files have no GPS (automated test)
- [ ] Deleting a trip/account removes its files (check the bucket)

**Security**
- [ ] Supabase Security Advisor: no warnings
- [ ] Secret key only in Production; publishable/secret keys (not legacy)
- [ ] Headers live (securityheaders.com); CSP report-only reviewed
- [ ] Geocoder/MapTiler quotas + domain restrictions; spend caps on
- [ ] MFA on founder accounts; Terms + Privacy pages; report email works

**SEO / AEO / previews**
- [ ] Trip text visible in view-source
- [ ] Titles, descriptions, canonicals on every public page
- [ ] `noindex` on unlisted, thin trips, empty profiles, app pages
- [ ] robots.txt + sitemap.xml live and submitted (Google + Bing)
- [ ] JSON-LD passes Rich Results Test
- [ ] WhatsApp + Instagram DM previews tested on real phones; OG < 300 KB
- [ ] `/demo` meets Core Web Vitals targets
