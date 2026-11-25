# Year Recap ("Your Year in Quests")

Owner: Product (OnQuest) · Status: **Approved** 25 Nov 2026 (the guesses in §14 are accepted as written) · Date: 25 Nov 2026
Design: claude.ai artifact https://claude.ai/artifact/HKKAwnjgb6K7gbPuVV58EC (source copy in the tripp Project: `claude/onquest-year-recap-template.html`)

## 1. Problem
Travelers forget how much they did in a year, and they have nothing to show for it. Spotify Wrapped shows that a year-end story people share brings new users in. OnQuest already has each traveler's year of Quests but nothing that sums it up. *(Assumption: the recap will be shared the way Wrapped is.)*

## 2. Users and context
Travelers aged 18–30 with at least one published Quest this year. They open it on a phone from the app or a notification, then share it on Instagram or WhatsApp. Friends open the shared link logged out, also on a phone.

## 3. Goals
- **Primary:** share rate, meaning recaps shared ÷ recaps viewed by their owner. Target ≥ 25%.
- **Guardrails:** sign-ups from recap links (just tracked, no target); recap page errors < 1%.

## 4. User stories
**Must**
1. As a traveler, I can open my recap for the year and tap through 9 slides.
2. As a traveler, I can share my recap with one tap (a copied link, or the phone's share sheet).
3. As a friend, I can open the shared link without signing in and see the same story.
4. The recap only counts my **published** Quests whose trip dates fall in that calendar year.

**Should**
5. As a traveler, I can replay the story from the share slide.
6. A link preview (OG image) shows my year, my Quest count and my top place.

**Could**
7. Export the slides as Instagram story images. This would reuse the existing export feature later.

## 5. Flow
- **Entry points:** a "Your 2026 in Quests" card on my profile and in the feed, shown from 1 Dec to 31 Jan, and the URL `/@handle/recap/2026`.
- **Navigation:** tap the right side or swipe to go forward, tap the left side to go back. Progress bars sit at the top.
- **Share slide:** the Share button opens the phone's share sheet, or copies the link where that isn't available. It shows the toast "Link copied". Replay goes back to slide 1.
- **Exit:** a close (×) button goes to the owner's profile.

## 6. Slides (as in the design; all text is server-rendered)
| # | Background | Content |
|---|---|---|
| 1 | paper | Intro: "@handle's {year} in Quests" |
| 2 | sand | Number of Quests, plus number of photos |
| 3 | shore | Top place (the place with the most days, then the most photos) |
| 4 | mist | Top 5 places |
| 5 | dusk | Month calendar: Quests per month, with the busiest month highlighted |
| 6 | night | Most loved Quest (most likes), with its cover photo and like count |
| 7 | forest | Travel personality, with 3 trait bars and the favourite template |
| 8 | desert | Distance travelled in km, with a one-line comparison |
| 9 | kraft | Share slide: 4 polaroids, a year stamp, then Share and Replay |

Polaroids use the traveler's **real photos**: the cover photo of the Quest each slide is about, or else the next photo. If there is no photo, the polaroid isn't shown.

**Copy rules**
- Numbers use Indian grouping (1,23,456).
- Distance is the straight line between consecutive places, in date order, across all of the year's Quests, rounded to the nearest 10 km.

**Travel personality** *(rule to confirm)*
The bars show three traits as percentages of the year's places:
- **Beach**: Coastal or Beach templates, or coastal places.
- **Mountain**: Mountain or Winter templates.
- **City / road**: everything else.

The persona name comes from the top trait: "Shore Chaser", "Peak Seeker" or "Road Wanderer". The favourite template is the one used most.

## 7. States
- **0 published Quests this year:** the owner sees "Your {year} story starts with your first Quest", with a "Create a Quest" button. A visitor gets a 404.
- **1 Quest:** slides 4 (top 5) and 5 (calendar) are skipped, and the bars count the remaining slides.
- **Fewer than 5 places:** slide 4 shows only the places there are.
- **No likes:** slide 6 shows the most recent Quest, with the title "Your latest Quest".
- **Only one place:** distance shows "Stayed put — and loved it" instead of a number.
- **Loading:** a paper background with a pulsing stamp. **Error:** "Couldn't load this recap", with a Retry button.
- **Accessibility:** under reduced motion, counters show the final number and nothing animates. Tap targets are at least 44 px, controls are labelled, and the story can be read with a screen reader as a list of slides.

## 8. Acceptance criteria (Must)
- **Story:** given @alok18 has 3 published Quests dated 2026 and 1 draft, when he opens `/@alok18/recap/2026`, then slide 2 shows "3". The draft is not counted.
- **Year cut-off:** given a Quest dated 28 Dec 2025 to 3 Jan 2026, it counts toward **2026**, because the year is decided by the start date. *(Rule to confirm.)*
- **Share:** given I'm on slide 9, when I tap Share, then the share sheet opens with the recap URL. On desktop the link is copied and "Link copied" shows.
- **Logged out:** given a logged-out visitor opens the URL, then they see the same 9 slides and no editing controls.
- **Hidden places:** given a Quest whose place is hidden, then that place never appears in the top place, the top 5, the distance or the map. This follows the existing privacy rules.

## 9. Edge cases
- **Small year** (1 Quest, 3 photos, no captions): it must still look full, using the skip rules above.
- **Big year** (20 Quests, 300 photos): the top 5 and calendar still fit, and the page stays under 2 s on 4G.
- **Owner changes their handle:** the old URL redirects permanently.
- **Quest deleted or unpublished:** the recap updates when it next loads.

## 10. Privacy and visibility
- The recap is **public**, the same as the traveler's profile: anyone with the link can see it.
- It only uses published, public Quests. Unlisted and private Quests are never counted.
- Hidden places and exact locations are never shown. Distance is computed but never shows a map.
- **Indexing:** noindex in v1. *(Question for the founder.)*
- **Existing users and content:** nothing changes. Trips, profiles, drafts and shared links stay as they are, and no existing page looks different.

## 11. UX test plan (preview build)
1. Open your recap on a phone, tap through all 9 slides, and check every number against your Quests. Pass if they all match.
2. Share it to WhatsApp, open the link logged out on a second phone, and check the link preview. Pass if it opens and the preview shows your year, Quest count and top place.
3. Test with an account that has 1 Quest and one that has 0. Pass if the skip rules and the empty state work.
4. Turn on reduced motion. Pass if nothing animates.

## 12. Analytics
- `recap_viewed` {year, is_owner, slide_count}
- `recap_slide_viewed` {year, slide}
- `recap_shared` {year, method: share_sheet|copy}
- `recap_replayed` {year}
- `signup_started` {source: 'recap'}

## 13. Out of scope (v1)
- Instagram image export of slides
- Music
- Comparisons with friends
- Recaps for any year before the user joined
- Editing or hiding individual slides
- Push or email notifications

## 14. Questions
**For the founder**
1. Is the personality rule and its names OK?
2. Is the year decided by the Quest's start date?
3. Should the recap stay noindex, or be indexed?
4. Is the 1 Dec – 31 Jan card window OK?
5. Can friends see a recap for years other than the current one?

**For the Tech Lead**
1. Should the year's totals be computed on each view, or cached per user and year, and when is the cache refreshed?
2. Will a new public read function, `get_year_recap(handle, year)`, follow the rules we already have for `get_*` functions?
3. How should the OG image be generated?
4. How do we compute the distance from the places' coordinates without exposing hidden places?

## 15. Rollout
Behind a flag, `year_recap`. It goes first to the @swativb, @alok18 and @quest accounts, then to everyone on 1 Dec 2026.
