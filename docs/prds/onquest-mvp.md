<!-- Copy of the founder's approved PRD, unchanged. Source: the founder's approved PRD, as handed to the Tech Lead with the spec request. Approved 2026-11-09; social layer re-approved 2026-11-09 evening. Specs: docs/specs/onquest-mvp-*.md -->

# OnQuest MVP

Nov 9, 2026 · @OnQuest

## Summary

OnQuest MVP lets a traveller turn up to 15 trip photos into an animated scrapbook webpage, called a Quest, in a few minutes on their phone. They share the link, friends like and comment, and every viewer is one tap from making their own Quest.

- **Status:** Approved by the founder on 9 Nov 2026. Social layer (welcome steps, home banner, bottom bar, feed, explore with search and guides, profiles and following) added the same day and re-approved that evening with four changes: likes need sign-in, unique views are counted for signed-out viewers (OnQuest team only), the feed is ranked, and auto-follow waits for later.
- **Owner:** founder (product). Engineering: Tech Lead agent, then the CTO.
- **Supersedes:** the v1 scrapbook PRD where they differ: 15 photos instead of 60, pages instead of open-ended days, and new likes, comments and notifications.
- **Wireframes:** low-fidelity, built on the OnQuest design system. They show layout and copy, not final visuals.

## Problem

After a trip, travellers have hundreds of photos and no quick, good-looking way to show friends the whole journey. A single Instagram post loses the story, and the tools that tell the story ask for too much work or too much control.

| Today's option | What works | Why it falls short |
| --- | --- | --- |
| Google Photos, Apple Photos memories | Automatic | The traveller doesn't control what's picked or how it looks |
| Instagram post or carousel | Friends are already there | Weak templates; the journey becomes ten loose photos |
| Canva | Beautiful results | Too complex for a quick post-trip share |
| Polarsteps | Full route and story | Must be installed and running during the trip; feels like a lot |

**Evidence vs. assumptions.** The table is the founder's view of the alternatives. There is no user research on this idea yet: the 250+ survey responses were about the earlier trip planner. Every claim about user behaviour in this PRD is an assumption the friends test must check.

## Target users

The creator is a traveller just back from a trip who wants to show it to friends. The viewer is a friend who taps the link and may never have heard of OnQuest.

|  | Creator | Viewer |
| --- | --- | --- |
| Who | 18 to 30, travels a few times a year, cares how memories look | A friend or family member of the creator |
| When | In the days after getting home, while the excitement lasts | When the link lands in WhatsApp or an Instagram story |
| Where | On a phone, photos in the camera roll or saved from WhatsApp | On a phone, often on mobile data |
| Time they'll give | A few minutes in one sitting | A minute or two |
| Account | Signs in with Google | None needed to watch; Google sign-in to like or comment |
| Wants | A Quest that looks great with little effort, and reactions from friends | To see the trip, react, and maybe make their own |

**Illustrative persona (not research):** Riya, 24, is back from four days in Goa with 380 photos. Some came from her camera and some from the group's WhatsApp chat. She wants something better than a photo dump to send to the friends who couldn't come, tonight, from her phone.

## Goals and success metrics

The MVP works if travellers sign up and keep coming back, and if friends who watch a Quest go on to make their own. The targets below are proposed starting points for the first 30 days of the friends test; there's no baseline yet, so the founder confirms or changes them before launch.

| Metric | Kind | How it's measured | Proposed target, first 30 days |
| --- | --- | --- | --- |
| Users onboarded | Adoption (primary) | People who sign up | 100 |
| Daily active users | Adoption | Unique signed-in people who open OnQuest in a day, creators and viewers | 20 on an average day by day 30 |
| Viewers per creator | Loop | Unique people who open a creator's published Quests | 10 or more per published Quest |
| Viewer to creator | Loop | Share of people who open a shared Quest and publish their own within 14 days | 5% |
| Time spent by viewers | Engagement | Median seconds a viewer spends on a Quest | 60 seconds or more |
| Time to publish | Engagement (lower is better) | Median minutes from first photo picked to Publish | 5 minutes or less |
| Links shared | Distribution | Copy link, Share to WhatsApp and Instagram downloads per published Quest | 2 or more |
| Creation completion | Guardrail | Share of started Quests that get published | 60% or more |

Also tracked, not targeted: likes and comments per published Quest, and creators returning after a notification. A trip product is used in bursts, so weekly active users will be steadier than daily; both are reported. Unique viewers include signed-out people, counted once per browser.

**Product requirement (proposed):** with 15 photos on a 4G connection, the arranged first draft appears within 60 seconds of the last photo finishing upload.

## User stories

Twenty-eight Must stories make the MVP; Should and Could are cut first if time runs short.

| ID | Priority | As a… | I want to… | So that… |
| --- | --- | --- | --- | --- |
| M1 | Must | creator | sign in with Google in one tap | I can start without filling in a form |
| M2 | Must | creator | pick 3 to 15 photos from my phone | my Quest is a highlight reel, not a dump |
| M3 | Must | creator | have my photos arranged into up to 5 pages automatically | I don't have to lay anything out |
| M4 | Must | creator | have dates, places and captions filled in when my photos carry that data | it feels finished without typing |
| M5 | Must | creator | add or change any caption, title, date or place, move or swap photos between pages, and remove, replace or add photos | it says what I want, if I care to |
| M6 | Must | creator | choose a template (Beach or Mountain) | it matches the trip |
| M7 | Must | creator | preview the animated Quest before publishing | I know what friends will see |
| M8 | Must | creator | publish as public, unlisted or private and get a link | I control who sees it |
| M9 | Must | viewer | watch a Quest from a link without signing in | it opens instantly |
| M10 | Must | viewer | like a Quest, signing in with Google first if I haven't | I can react in one tap |
| M11 | Must | viewer | comment after signing in | I can say something to my friend |
| M12 | Must | viewer | tap "Make your own Quest" | I can make one for my trip |
| M13 | Must | creator | get notified in OnQuest and by email about likes and comments | I come back to see them |
| M14 | Must | creator | delete any comment and turn comments off | my Quest stays mine |
| M15 | Must | creator | see all my published Quests on my profile | my trips live in one place |
| M16 | Must | creator | edit or delete a Quest after publishing | I can fix mistakes or take it down |
| M17 | Must | creator | download my Quest as an Instagram story and carousel that link back | I can share where my friends already are |
| M18 | Must | new user | see three short welcome screens after picking a username, and skip them | I know what a Quest is before I start |
| M19 | Must | user | see a big "Create a Quest" banner on Home, with a "What's a Quest?" explainer | the main thing to do is obvious |
| M20 | Must | user | move between Home, Explore, Create, Quests and Profile from a bottom bar | I can get anywhere in one tap |
| M21 | Must | user | see Quests from people I follow on Home, under my own Quests, with suggestions when it's thin | I see my friends' trips |
| M22 | Must | user | follow and unfollow people, and see anyone's profile with their public Quests, followers and following | I can keep up with travellers I like |
| M23 | Must | user | search Quests, places and people from Explore | I can find a trip or a person |
| M24 | Must | user | read travel guides on Explore, each linking to related Quests | I get ideas for my next trip |
| M25 | Must | user | edit my name, username, photo, home city and bio | my profile looks like me |
| M26 | Must | user | choose which emails I get, how new Quests start (public, unlisted, private), whether my places show, sign out and delete my account | I'm in control of my account |
| M27 | Must | user | see who follows me and who I follow, and follow or unfollow from the list | I can manage my connections |
| M28 | Must | creator | manage a published Quest from a ⋯ menu: edit, share, download for Instagram, change who can see it, turn comments on or off, delete | I can change it after posting |
| S2 | Should | creator | get an email straight away for each like and comment, and be able to turn these emails off | I know the moment friends react |
| S3 | Should | creator | see "Be the first to like this" instead of a zero | a new Quest doesn't look ignored |
| C1 | Could | creator | send the link to WhatsApp in one tap from the publish screen | sharing takes no copy-paste |
| C2 | Could | creator | pick from more templates | more trips feel matched |

## User flows

Three flows make one loop: a creator publishes, a friend watches and reacts, and "Make your own Quest" turns that friend into the next creator.

&#91;embedded content: The Quest loop · creator flow, friend flow, back to sign-in\]

**Create and publish (creator)**

1. Tap "Create a Quest" (home, profile, or "Make your own Quest" on someone else's Quest). Not signed in: Google sign-in, then straight back to step 2.
2. Pick photos: up to 15. The counter shows "9 of 15". Uploading starts as soon as a photo is picked.
3. Arranging: OnQuest groups the photos into up to 5 pages.
   - Photos with dates: one page per day for trips of 5 days or fewer; longer trips become up to 5 chapters ("Days 4–6 · Gokarna").
   - Photos with locations: page titles get the place name; a small model writes short captions from the date and place only.
   - Photos without dates (saved from WhatsApp or Instagram): kept in the order picked, 3 to a page, titled "Page 1" to "Page 5", no captions.
4. Review pages: the draft is ready to publish as is. Editing is optional: tap a photo to change its caption, date or place (kept low-key), or to move, replace or remove it; tap a page title to rename it; add photos up to 15.
5. Pick a template: Beach or Mountain.
6. Preview the animated Quest.
7. Publish: title (pre-filled), visibility (Public, Unlisted, Private), then the share screen with Copy link, Share to WhatsApp and Download for Instagram.

**Watch and react (viewer)**

1. Open the link from WhatsApp or Instagram. No sign-in.
2. The Quest plays page by page; the viewer can scroll or tap through.
3. Like: one tap, once per person per Quest. Not signed in: Google sign-in, then back on the same Quest with the like counted.
4. Comment: tap "Add a comment". Not signed in: Google sign-in, then back to the same Quest with the comment box open.
5. "Make your own Quest" stays visible; it starts the create flow.

**Notify (creator)**

1. A like or comment arrives: the bell in OnQuest shows it at once.
2. Email: sent straight away for each like and each comment, with a link to the Quest. Every email has a one-tap link to stop these emails (Should, S2).
3. From any comment, the owner can delete it; from the Quest's settings, turn comments off.

**Browse, follow and explore (signed in)**

1. First sign-in: pick a username, then three welcome screens ("Your trip, as a scrapbook", "Pick photos. We do the rest.", "Share it. Friends react."), each with Skip. The last offers "Create your first Quest" or "Look around first".
2. A bottom bar on Home, Explore, Quests and Profile: Home · Explore · Create (a raised orange button that opens a chooser: "Create a Quest", or "Write a blog" tagged "Releasing soon", which says "Blogs are releasing soon. For now, share your trip as a Quest.") · Quests · Profile. Quests lists all your own Quests and is also a way in to creating one. It's hidden while creating a Quest and on a Quest page.
3. Home: a big banner, "Turn your last trip into a Quest", with Create a Quest and What's a Quest?; then Your Quests; then the feed.
4. Feed, on Home after Your Quests: public Quests from people you follow, ranked by likes, then comments, then how new they are, combined so a new Quest isn't buried under an old popular one, then "Suggested for you". When you follow nobody: "Follow travellers to see their Quests here" and "Find people to follow".
5. Explore: search places, Quests and people; place chips; Trending Quests; Stories and guides; Travellers to follow. Typing shows results grouped as Quests, People and Stories.
6. Profiles: anyone's name, username, city, bio, Quests, Followers and Following, the places they've been, their public Quests, and Follow. Someone's Quest opens with a back button and Follow next to their name.

## Screens and wireframes

Nine phone screens cover the MVP. All app screens use the OnQuest design system (white surfaces, one orange primary button per screen, 44 px tap targets); the Quest page itself uses the chosen template. Copy in quotes is final unless the founder changes it.

**1. Sign in.** Light logo, contour texture behind. Title "Turn your trip into a Quest". Primary "Continue with Google"; quiet link "Email me a sign-in link". From "Make your own Quest" or a comment, the title reads "Sign in to make your Quest", "Sign in to like" or "Sign in to comment". Error: "Sign-in didn't work. Try again." First sign-in only: "Pick a username", pre-filled from the Google name; 3 to 20 lowercase letters, numbers or underscores; a taken name shows "That username is taken."

**2. Home (my Quests).** Header: logo, bell with unread count, profile photo. Primary "Create a Quest". Grid of Quest cards, 2 columns, newest first; Draft and Unlisted tags. Empty: "No Quests yet. Your next trip starts here." + "Create a Quest".

**3. Pick photos.** Title "Pick up to 15 photos". Counter "9 of 15". Grid with a tick on picked photos; picking a 16th shows "A Quest holds 15 photos. Remove one to add another." Primary "Next" enabled from 3 photos; with fewer, it reads "Pick at least 3 photos". Each photo shows upload progress; a failed one shows "Retry".

&#91;image: Wireframes 1 to 3: sign in, home, pick photos\]

**4. Arranging.** One line changes as work happens: "Sorting by day…", "Finding places…", "Writing captions…". No spinner without words. Done in 60 s or less (Goals). If arranging fails: "We couldn't arrange this automatically. Your photos are in the order you picked them." and the review screen opens.

**5. Review pages.** Title (pre-filled, editable). Page cards 1 to 5, each with its title and a pencil to rename it, the dates its photos cover, and 3 photo slots; an empty slot shows "+" to add a photo there. Tap any photo to open its sheet: caption (60 chars), then a quiet date-and-place row ("Sat 17 Oct · Panjim · Change", or "No date or place · Add") that opens a date picker and a place field, then three actions: "Move to another page", "Replace with another photo", "Remove from Quest". Move lists the other pages: a page with space takes the photo; on a full page, tapping one of its photos swaps the two; "Start a new page with it" while there are fewer than 5 pages. Remove keeps at least 3 photos ("A Quest needs at least 3 photos. Replace this one instead."); a page left empty disappears. Below the pages: "+ Add photos · 12 of 15". Every move, swap, remove, replace and add shows a short message with Undo. Page titles and dates follow their photos until the person renames a page; then the name stays. Changing a photo's date doesn't move it. A photo with no date shows a small white dot. Primary "Choose a template". An empty caption shows nothing on the Quest, never a placeholder.

**6. Choose a template.** Two large previews, Beach and Mountain, each with the creator's own cover photo. Primary "Preview".

&#91;image: Wireframes 4 to 6: arranging, review pages, choose a template\]

**7. Preview.** The real animated Quest, full screen, with a bottom bar: "Back to edit" and primary "Publish".

**8. Publish and share.** Sheet: title, visibility (Public: anyone can find it on your profile. Unlisted: only people with the link. Private: only you). Public is selected by default. Primary "Publish". Then: "Your Quest is live!", the link (onquest.in/@username/quest-title, the title part made from the Quest's title), "Copy link", "Share to WhatsApp", "Download for Instagram".

**9. Quest page (viewer).** The template's animated pages. Under the last page: creator's name and photo, like button with count (hidden below 3 likes: "Be the first to like this"), comments (newest last), "Add a comment". A sticky bottom bar: "Make your own Quest". Comments off: the comments area says "Comments are off for this Quest."

**Viewing a Quest (any viewer).** The Quest is a cover, then each photo page, then a route page that draws the trip's path between its places. Tapping the right side turns forward; on the route page it goes back to the cover, so a Quest loops. A full-screen button (bottom right of the Quest) hides everything else and shows a page counter ("2 / 4"), a close button and a like button; Escape or close leaves it. On your own Quest there is no "Make your own Quest" button; it shows only on other people's Quests and on shared links.

&#91;image: Wireframes 7 to 9: preview, publish and share, Quest page for a signed-out friend\]

Not drawn but required: notifications list (bell), Quest settings (visibility, comments on/off, delete with "Delete this Quest? This can't be undone."), and the Instagram export preview (story and carousel, "Download").

Screens 10 to 20 are drawn in the clickable prototype ([OnQuest Prototype](https://claude.ai/artifact/4Madapb1ZGNwu8C2kaVdPV)), not as wireframes. It is the visual reference for the build.

**10. Welcome (first sign-in only).** Three steps, each a fan of three photos, a headline and one sentence, with dots and Skip. Last step: primary "Create your first Quest", quiet "Look around first".

**11. Home.** Replaces screen 2's top. Banner on the brand wash with the contour texture and a fan of photos: "Hi Riya", "Turn your last trip into a Quest", "Pick 3 to 15 photos. We'll make the scrapbook in under a minute.", primary "Create a Quest", quiet "What's a Quest?" (a sheet with the 3 steps, Create a Quest and See an example). Then Your Quests (2 columns; your published Quests have a ⋯ menu, a draft says "Continue editing"), then the feed: "From people you follow" and "Suggested for you" (screen 12).

**12. Feed (on Home, no separate tab).** Full-width cards: avatar, name, places and how long ago; cover photo with the title and "2 pages · 6 photos"; like (with count), comments (with count), share. Ranked by likes, then comments, then how new, combined so a new Quest isn't buried under an old popular one. Then "Suggested for you".

**13. Explore and search.** A search box under the title: "Search places, Quests or people", with Clear. Without a search: place chips, Trending Quests (2 columns with like counts), Stories and guides (image, "Guide · 4 min read", title), Travellers to follow (with Follow). With a search: Quests, People and Stories sections; no results: "Nothing for "…"" and a hint to try a place.

**14. Guide.** Full-width image, "Guide · 4 min read · by the OnQuest team", title, short paragraphs, then "Quests from this guide". Back and share in the top bar.

**15. Profile (yours and others').** Cover band with the contour texture, avatar, name, @username and city, bio, a 3-part count (Quests, Followers, Following), place chips, the public Quests grid. Others' profiles add Follow / Following; yours shows the bottom bar. Only public Quests appear.

**16. Edit profile** (from your profile or Settings). Cancel and Save; Save works only after a change and when everything is valid. Photo with Change photo and Remove; Name (40 characters, required: "Add your name so friends recognise you."); Username (same rules as sign-up; changing it says "Your Quest links change to onquest.in/@… Old links keep working."); Home city (optional); Bio (150).

**17. Settings** (gear on your profile). Account: Edit profile; Email (from Google, read-only). Email me when: someone likes my Quest, comments, follows me (switches; the bell always shows these). Privacy: "New Quests start as" Public / Unlisted / Private; Show places on my profile. Help: What's a Quest?, Send feedback, Privacy policy and terms. Sign out (with a confirm). Delete account (type DELETE to confirm; removes profile, Quests, photos, likes, comments and follows).

**18. Followers and Following.** Tapping a count on any profile opens the list; each person has Follow or Following.

**19. Manage a Quest** (⋯ on your Quest cards and on your own Quest page). Edit Quest, Share link, Download for Instagram, Who can see it (Public / Unlisted / Private), Comments switch, Delete Quest (confirm: "…This can't be undone.").

**20. Your Quests (Quests tab).** Title "Your Quests" and the bell. At the top, a large "Create a Quest" card ("Pick 3 to 15 photos from a trip") that starts the create flow. A switch for All / Published / Drafts. A 2-column grid of every Quest you've made, whatever its visibility: Draft, Unlisted and Private tags; published ones show likes and comments and have the ⋯ menu; drafts say "Continue editing". Empty: "No drafts. Quests you start and leave show up here." or "Nothing published yet." with Create a Quest.

## Acceptance criteria

Every Must story has at least one check the UX tester can run on the preview build.

| Story | Given | When | Then |
| --- | --- | --- | --- |
| M1 | I'm signed out on "Make your own Quest" | I tap it and finish Google sign-in | I land on Pick photos, not on Home |
| M2 | I've picked 15 photos | I tap a 16th | It isn't added and I see "A Quest holds 15 photos. Remove one to add another." |
| M2 | I've picked 2 photos | I look at Next | It's disabled and reads "Pick at least 3 photos"; picking a third enables it |
| M3 | 12 photos taken over 3 days, all with dates | Arranging finishes | I see 3 pages, one per day, in date order |
| M3 | 15 photos over 9 days | Arranging finishes | I see at most 5 pages, each titled with its day range |
| M3 | 7 photos saved from WhatsApp, no dates | Arranging finishes | I see 3 pages (3, 3, 1 photos) in the order I picked, titled "Page 1" to "Page 3", no captions |
| M4 | Photos with location data from Panjim | Arranging finishes | The page title includes "Panjim" and each of those photos has a caption of 60 characters or fewer |
| M4 | Photos with no location data | Arranging finishes | No caption is written for them |
| M5 | A page with 3 photos | I move one photo to the next page that has 2 | Both pages show the change in the preview |
| M5 | Pages 2 and 3 both have 3 photos | I move a page-2 photo to page 3 and tap one of page 3's photos | The two photos swap places, and Undo puts them back |
| M5 | My Quest has exactly 3 photos | I tap Remove on one | It stays, and I see "A Quest needs at least 3 photos. Replace this one instead." |
| M5 | A photo on page 1 with a caption | I tap Replace and pick another photo | The new photo takes the same slot on page 1, and I can tap Undo |
| M5 | A photo saved from WhatsApp, with no date | I open it, tap Add on the date-and-place row and set a date | The photo stays on its page, and the page's dates update to include it |
| M6 | I chose Beach | I switch to Mountain | The preview uses Mountain with the same photos and words |
| M7 | Any draft | I tap Preview | I see the Quest exactly as a viewer would, with animation |
| M8 | I publish as Unlisted | A signed-out friend opens the link | The Quest plays; it doesn't appear on my public profile or in search |
| M8 | I publish as Private | A signed-out friend opens the link | They see "This Quest is private." and no photos |
| M9 | A public Quest link | A signed-out viewer opens it on a phone over 4G | The first page shows without a sign-in prompt |
| M10 | I'm signed out and haven't liked this Quest | I tap like and finish Google sign-in | I'm back on the same Quest, the count goes up by 1 and the heart is filled; tapping again un-likes it |
| M11 | I'm signed out | I tap "Add a comment" and sign in | I'm back on the same Quest with the comment box open |
| M12 | Any Quest page | I scroll anywhere | "Make your own Quest" stays visible |
| M13 | Someone comments on my Quest | Within 1 minute | The bell shows an unread count of 1 |
| M14 | I own the Quest | I turn comments off | Existing comments are hidden and viewers see "Comments are off for this Quest." |
| M15 | I have 2 public and 1 unlisted Quest | Someone opens my profile | They see the 2 public Quests only |
| M16 | I delete a published Quest | Anyone opens its old link | They see "This Quest was removed." |
| M17 | I've published a Quest with 5 pages | I tap "Download for Instagram" | I can save a story image and a carousel of the Quest's pages, each image showing the Quest's link |
| M18 | I've just picked my username | I tap Skip on the first welcome screen | I land on Home with the Create a Quest banner |
| M19 | I'm on Home | I tap "What's a Quest?" | A sheet explains it in 3 steps, with Create a Quest and See an example |
| M20 | I'm on Explore | I tap Create in the bottom bar | Pick photos opens, and the bottom bar stays hidden until I leave the flow |
| M21 | I follow nobody | I open Home | Under my Quests I see "Follow travellers to see their Quests here" with "Find people to follow", plus suggested Quests |
| M21 | I follow Neha | Neha publishes a public Quest | It appears under "From people you follow" on Home, above "Suggested for you"; a Quest from someone I follow with more likes and comments from the same day sits above it |
| M22 | I'm on Aman's profile | I tap Follow | It changes to Following and his follower count goes up by 1; tapping again unfollows |
| M22 | Aman has 1 public and 1 unlisted Quest | I open his profile | I see only the public one |
| M23 | I'm on Explore | I type "goa" | Results are grouped into Quests, People and Stories; a search with no matches says so and suggests trying a place |
| M24 | I open a guide | I scroll to the end | I see the Quests linked to the guide and can open them |
| M25 | I change my username to riya\_goa | I tap Save | My profile and Quest links use @riya\_goa, and my old links still open my Quests |
| M25 | I clear my name | I look at Save | It's disabled and I see "Add your name so friends recognise you." |
| M26 | I turned off "Someone likes my Quest" | Someone likes my Quest | The bell shows it and no email is sent |
| M26 | I tap Delete account | I type DELETE and confirm | My profile, Quests, photos, likes, comments and follows are removed, and I'm signed out |
| M27 | I follow 2 people | I tap Following on my profile | I see both, each with a Following button that unfollows |
| M28 | I own a public Quest | I open its ⋯ menu and pick Unlisted | It leaves my profile and search, and its link still works |
| M9 | I'm on the route page of a Quest | I tap to turn forward | The cover shows again |
| M9 | I'm viewing someone's Quest | I tap the full-screen button | Only the Quest shows, with a page counter, close and like; close returns me to the same page |
| M12 | I open my own Quest | I scroll the page | There is no "Make your own Quest" button |

## Edge cases, privacy and existing content

The Quest must look finished at both extremes: 3 photos with no data, and 15 photos over 10 days with every caption filled in.

| Case | Expected behaviour |
| --- | --- |
| 3 photos (the minimum) | One page of 3 photos, laid out by the template without empty slots |
| All photos on one day | Up to 5 pages of 3, split by time of day; titles "Morning", "Afternoon", "Evening" where times allow |
| Some photos have dates, some don't | Dated photos go to their day; undated ones join the nearest page in pick order |
| Trip longer than 5 days | Up to 5 chapters, each titled with its day range and main place |
| No text anywhere | The Quest shows photos, page titles and dates only; no empty caption boxes |
| Very large or HEIC photos | Accepted; shrunk before upload; never rejected for size alone |
| Slow network or going offline mid-upload | Picked photos keep uploading when back online; the draft is saved; nothing picked is lost |
| A photo fails to upload 3 times | It shows "Retry" and "Remove"; the rest of the Quest still works |
| Leaving mid-creation | The draft is saved and appears on Home with a Draft tag |
| Spam likes | One like per person per Quest; repeated taps from one person never add more |
| Abusive comment | The owner deletes it in one tap; reporting is out of scope for the MVP |

**Who can see what**

- Public: anyone with the link; listed on the creator's profile; can appear in search.
- Unlisted: anyone with the link; not on the profile; never in search.
- Private: only the owner; the link shows "This Quest is private."
- Likes are anonymous to viewers; the creator sees a count, not names. Comments show the commenter's name and photo.
- View counts, including unique signed-out viewers, are for the OnQuest team only: never shown on a Quest or to its creator.
- Never shown or stored: a photo's exact location. Only the place name ("Panjim") is kept.

**Existing content.** OnQuest has no real users yet, so no published Quests need migrating. Test trips made during v1 development keep working; if one has more than 15 photos, it still plays, and editing it asks the creator to choose 15. To confirm with the Tech Lead.

## UX test plan and analytics

The founder runs these five tasks on a real phone against the preview build; all five must pass before code review.

1. **Make a Quest from camera photos.** Sign in, pick 15 photos from a real trip, publish without editing anything. Pass: published in under 5 minutes, pages in the right day order, no empty boxes.
2. **Make a Quest from WhatsApp photos.** Pick 6 photos saved from a WhatsApp chat. Pass: pick order kept, no invented captions, looks finished.
3. **Edit and re-publish.** Change a caption, move a photo, switch template, publish again. Pass: the shared link shows the changes; nothing else moved.
4. **Be the friend.** On a second phone, signed out, open the link from WhatsApp, tap like, sign in, then add a comment. Pass: plays without sign-in; after sign-in you're back on the same Quest with the like counted; commenting needs no second sign-in.
5. **Be notified and moderate.** Back on the creator's phone. Pass: the bell shows the like and comment; deleting the comment and turning comments off both work.

**Analytics.** The full event list lives in the [OnQuest Taxonomy sheet](https://docs.google.com/spreadsheets/d/12Ers_nihMPy1hgzmNmvvDkXsFZA6RiNsKN9oTQdtHks/edit): 35 client events and 21 server events, each with its properties, data types and allowed values, plus common properties sent on every event. Every event is stored as name, user\_id, type (client or server), ts (client\_ts or server\_ts) and properties (one JSON object). Server events are the source of truth for anything counted. No user text, emails, photo links or exact locations go into any property. The table below lists the key ones; the sheet wins where they differ. Every prototype change updates the sheet in the same pass, and an automated click-through checks each event's name, type, timestamp, required properties, data types and allowed values (results in the sheet's Test cases tab).

| Event | When | Properties |
| --- | --- | --- |
| signed\_up | First sign-in completes | source: create, comment, make\_your\_own, home |
| quest\_create\_started | Create a Quest tapped | source: home, profile, make\_your\_own |
| photos\_picked | Next tapped on Pick photos | count, with\_dates, with\_location |
| quest\_arranged | Arranging finished | pages, seconds, captions\_written, fallback\_used |
| quest\_edited | Any edit saved before publish | field: caption, title, date, place, move, merge |
| quest\_published | Publish tapped | visibility, template, photos, minutes\_since\_start |
| quest\_link\_shared | Copy link or Share to WhatsApp tapped | channel: copy, whatsapp |
| quest\_viewed | A Quest page opens | signed\_in, referrer: whatsapp, instagram, other; an anonymous visitor ID when signed out |
| quest\_view\_ended | A viewer leaves the Quest page | seconds, pages\_seen |
| quest\_liked | Like tapped | none (likes need sign-in) |
| comment\_posted | Comment sent | none |
| make\_your\_own\_tapped | The sticky button tapped | signed\_in |
| notification\_opened | Bell item or email link opened | channel: bell, email |
| instagram\_export\_downloaded | Download tapped | format: story, carousel |
| ftue\_step\_viewed | A welcome screen shows | step (1 to 3), skipped |
| home\_banner\_tapped | Create a Quest or What's a Quest tapped on Home | target: create, whatis |
| feed\_viewed | The feed section on Home comes into view | follows\_count, items |
| followed | Follow or Following tapped | source: profile, quest, explore, feed; unfollow |
| search\_performed | Typing pauses for 500 ms on Explore | results\_quests, results\_people, results\_stories (never the search text) |
| guide\_opened | A guide opens | guide\_id, source |
| profile\_edited | Save tapped on Edit profile | fields: name, username, photo, city, bio (which changed, never the values) |
| setting\_changed | Any switch or choice in Settings | setting, value |
| quest\_managed | A change from a Quest's ⋯ menu | action: visibility, comments, delete; value |
| account\_deleted | Delete account confirmed | quests\_count |

## Scope, rollout and risks

**Out of scope for the MVP**

- More than 15 photos or 5 pages, and any paid plan
- OnQuest picking the photos for the creator
- Captions written from what's in a photo (only date and place are used)
- Video, Live Photos and audio
- Reporting comments, blocking people, private profiles, and people writing their own guides (guides come from the OnQuest team)
- Co-creating one Quest with friends
- A phone app and push notifications
- Printed books
- Blogs (Create shows "Write a blog" as Releasing soon)
- Auto-following the person whose shared Quest brought a new user in (later)

**Rollout.** Behind a feature flag, to the founders first, then a friends test of invited creators. The v1 flow is replaced, not run alongside it. No public launch until the friends test numbers are reviewed against the targets the founder sets.

**Risks and how we'll know early**

| Risk | Signal in the friends test | Fallback |
| --- | --- | --- |
| 15 photos feels too few | Creators remove and re-add photos many times, or say so | Raise the cap after the test; keep 3 per page |
| Friends watch but don't react | Likes per view stay near zero | Make like more prominent; test a reaction on each page |
| Photo dates and places are missing more often than expected | quest\_arranged shows the fallback used for most Quests | Make the "add a date" prompt more visible on review |
| Viewers don't make their own | make\_your\_own\_tapped is rare | Test the button's copy and position |
| Abusive comments on public Quests | Owners delete comments or turn them off | Add reporting and a block list |
| Feeds are empty in a small friends test | Most feed\_viewed events have 0 follows | Auto-follow the person whose link someone signed up from; lean on suggestions and guides |

## Open questions

**For the founder (all closed, 9 Nov 2026)**

- [x] Targets for the three metrics in Goals
- [x] Is the Instagram export a Must for the friends test, or can it follow (it's a Should here)?
- [x] Default visibility when publishing: Public or Unlisted?
- [x] Minimum photos to publish: 1, or 3?
- [x] Is one email per Quest per day right, or immediately for comments and daily for likes?
- [x] Usernames and Quest links: what a username can contain, and what a Quest's web address looks like, e.g. onquest.in/@riya/three-days-in-goa (still open from the v1 PRD, §17)

**For the founder (new, from the social layer)**

- [ ] Who writes guides? This PRD assumes the OnQuest team, a handful at launch.
- [ ] Do new followers trigger a notification and an email, like likes and comments do?
- [x] Feed order: ranked by likes, then comments, then newest, combined into one order (decided 9 Nov)
- [x] Should new users auto-follow the person whose shared Quest brought them in? Later, not in the MVP (decided 9 Nov)

**For the Tech Lead (in the spec)**

- [ ] How to count unique signed-out viewers (once per browser), keep link-preview bots out of the count, and link a viewer to their account when they sign in
- [ ] Which small model writes captions, its cost per Quest, and how long it adds to arranging
- [ ] Reading photo dates and places in the browser before upload, without keeping exact locations
- [ ] Meeting the 60-second arranging target on 4G with 15 photos
- [ ] Email sending for notifications (Resend is already planned for sign-in)
- [ ] Attributing a new creator to the Quest they came from, for the primary metric
- [ ] What changes in the editor already built (60-photo limit, day structure) and what can be kept
- [ ] Likes and comments under the no-in-place-updates rule (decision 0001)

**For the Tech Lead (social layer)**

- [ ] Follows, feed (ranked by likes, comments and how new, paginated; how to weight them) and suggestions under decision 0001
- [ ] Search across Quests, places, people and guides: what to index, and how fast
- [ ] Where guides live and how the OnQuest team publishes them
- [ ] Which screens can ship first with sample data while the backend catches up
