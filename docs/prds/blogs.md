# OnQuest Blogs

Nov 23, 2026 · @OnQuest

Source: https://claude.ai/artifact/6PEDRD3Ppr1Qy99cqSHESm (the doc is the source of truth; this is a copy for the repo. The two wireframe embeds are not copied.)

## Summary

Blogs let a traveller write about a trip in their own words: a title, the story or tips, photos, and a link to the trip's Quest at the end. Writing one works like posting on Reddit: one screen with a title, photos and text, then Post. A Quest shows the trip, and a blog tells it. Each one sends readers to the other.

- **Status:** Approved by the founder on 23 Nov 2026. Ticket OQ-11 in QuestLog.
- **Owner:** founder (product). Engineering: Tech Lead agent, then the CTO.
- **Builds on:** the approved OnQuest MVP PRD (9 Nov 2026). Sign-in, visibility, likes, comments, notifications, profiles, feed and Explore work the way that PRD says unless this one says otherwise.
- **Replaces:** the "Write a blog · Releasing soon" placeholder in the Create chooser.
- **Wireframes:** low-fidelity, on the OnQuest design system. They show layout and copy, not final visuals.

## Problem

A Quest is photo-first. It holds 15 photos and short captions, and it has no room for the part of a trip people ask about afterwards: where to stay, what it cost, what to skip, and what happened along the way. Today a traveller writes that in a long Instagram caption, a WhatsApp message or a notes app, apart from the photos. Explore's Stories and guides come only from the OnQuest team.

**Evidence vs. assumptions.** No user research on blogs yet. That travellers want to write longer posts, and that readers will tap through to the Quest, are assumptions for the friends test to check.

## Target users

|  | Writer | Reader |
| --- | --- | --- |
| Who | An OnQuest creator who has something to say about a trip: tips, a guide, a story | A friend, or someone on Explore planning a similar trip |
| When | After the trip, often right after publishing the Quest, or later | From a shared link, the feed, a profile or Explore |
| Where | On a phone; photos in the camera roll | On a phone, often on mobile data |
| Time they'll give | 5 to 20 minutes, maybe across two sittings | 2 to 5 minutes |
| Account | Signed in | None needed to read; sign-in to like or comment |

**Illustrative persona (not research):** Riya published her Goa Quest. Three friends asked where she stayed and how she got around. She writes "Goa on ₹15k: what worked" with 4 photos, links her Quest at the end and shares it.

## Goals and success metrics

No targets for now: OnQuest is going from 0 to 1, so these metrics are tracked to learn from, not to hit.

| Metric | Kind | How it's measured |
| --- | --- | --- |
| Blogs published | Adoption (primary) | Blogs published by friends-test users |
| Blog to Quest | Loop | Share of blog views with a linked Quest where the reader opens the Quest |
| Read through | Engagement | Share of blog views where the reader reaches the end |
| Quests published | Guardrail | Quests published per week, compared with the 4 weeks before blogs; should not drop |
| Draft completion | Guardrail | Share of started blogs that get published |

## User stories

| ID | Priority | As a… | I want to… | So that… |
| --- | --- | --- | --- | --- |
| B1 | Must | writer | pick "Write a blog" from Create | I can start one in a tap |
| B2 | Must | writer | write a title and text on one screen | it's as easy as a Reddit post |
| B3 | Must | writer | add up to 10 photos | readers see what I'm talking about |
| B4 | Must | writer | link one of my Quests at the end | readers can see the whole trip |
| B5 | Must | writer | have my draft saved as I write | I can finish it later without losing anything |
| B6 | Must | writer | preview the blog before posting | I know what readers will see |
| B7 | Must | writer | post as Public, Unlisted or Private and get a link | I control who sees it |
| B8 | Must | reader | read a blog from a link without signing in | it opens straight away |
| B9 | Must | reader | open the linked Quest from the end of the blog | I can see the trip |
| B10 | Must | reader | like and comment, signing in first if needed | I can react |
| B11 | Must | writer | edit or delete a blog after posting, and turn comments off | I can fix it or take it down |
| B12 | Must | user | see someone's blogs on their profile, next to their Quests | their writing lives with their trips |
| B13 | Must | writer | get notified about likes and comments on my blog | I come back to see them |
| S1 | Should | writer | add a place to the blog | it shows up when people search that place |
| S2 | Should | user | see public blogs from people I follow in the Home feed | I see what friends write |
| S3 | Should | user | find public blogs under Stories in Explore and search | I can find tips for a trip |
| S4 | Later | writer | write a blog from my own Quest ("Write about this trip" in its ⋯ menu), with that Quest already linked. Not in this release: later, as a suggestion tooltip after the Quest-published celebration | the two go together without extra steps |
| C1 | Could | writer | use bold, a heading and a bullet list | longer guides are easier to read |
| C2 | Could | writer | place photos between paragraphs instead of in one gallery | the photos sit next to the text about them |

## User flows

**Write and post (writer)**

1. Tap Create in the bottom bar, then "Write a blog". Not signed in: Google sign-in, then back to step 2.
2. Composer: a title, then "Add photos", then the body. The draft saves itself; leaving shows "Saved as a draft."
3. Optional: add a place (S1); tap "Link a Quest" and choose one of your published Quests.
4. Tap Preview to see the blog as readers will, then "Back to edit" or Post.
5. Post: a sheet asks who can see it (Public, Unlisted, Private; it starts with your Settings choice for new Quests), then "Your blog is live!" with Copy link and Share to WhatsApp.

**Read and react (reader)**

1. Open the link, or a card in the feed, on a profile or in Explore. No sign-in.
2. Read the title, the writer and the photo gallery, then the text.
3. At the end: the linked Quest card, "From this trip". Tapping it opens the Quest.
4. Like or comment, signing in with Google first when needed, then back on the same blog (as with Quests).
5. The end of the blog has "Write your own", which opens the chooser: "Create a Quest" or "Write a blog".

**Notify and manage (writer)**

1. Likes and comments show in the bell and send emails, following the same Settings switches as Quests.
2. The ⋯ menu on your blog: Edit, Share link, Who can see it, Comments on/off, Delete ("Delete this blog? This can't be undone.").

## Screens and wireframes

Eight phone screens. App screens use the OnQuest design system: white surfaces, one orange primary button per screen and 44 px tap targets. Copy in quotes is final unless the founder changes it.

**B1. Create chooser.** The current sheet, with "Write a blog" now active: an icon, "Write a blog", "Tips, guides and longer stories from your travels." The "Releasing soon" pill and the toast are removed. "Create a Quest" stays the larger, highlighted option.

**B2. Composer.** Top bar: Close (X), "Saved" in muted text after each save, Preview, and a primary "Post". Post works once there is a title and either some text or a photo; until then tapping it says "Add a title and some text or a photo." Then, top to bottom:

- Title field, large type, placeholder "Title", up to 100 characters, with a counter from 80 on.
- Photo row: a dashed "+ Add photos" tile, then the picked photos as square thumbnails you can drag to reorder, each with a remove (×). A counter shows "4 of 10". An 11th photo shows "A blog holds 10 photos." The first photo is the cover.
- Body field, placeholder "Tell the story, share tips, what you'd do again…", up to 10,000 characters. Plain text with paragraphs; line breaks are kept.
- "Add a place" row with a pin (S1). It shows the chosen place, for example "Goa", with Change.
- "Link a Quest" row with the Quest icon. After a choice it becomes a small Quest card with the cover, title and Remove.

Close on an empty draft discards it. Close on a draft with content shows "Saved as a draft." and returns to where you started.

**B3. Link a Quest sheet.** Title "Link a Quest". "Readers see it at the end of your blog." A list of your published Quests, newest first: cover, title, places and visibility tag. One can be chosen. Private Quests appear with the note "Only you can see this one". Empty: "You haven't published a Quest yet." with "Create a Quest" (it saves the blog draft first).

[Wireframes B1 to B3: Create chooser, composer, Link a Quest — see the doc]

**B4. Post and share.** Sheet: "Who can see this blog?" with Public ("Anyone can find it on your profile"), Unlisted ("Only people with the link") and Private ("Only you"). The default is your "New Quests start as" setting. Primary "Post". Then: "Your blog is live!", the link onquest.in/@username/blog/blog-title, "Copy link" and "Share to WhatsApp".

**B5. Blog page (reader).** Back and share in the top bar. Writer row: avatar, name, @username, "3 days ago · 4 min read", Follow (on other people's blogs). Title. Place chip if added. The photo gallery, swiped sideways, with a counter "1 / 4"; tapping a photo opens it full screen. A blog with no photos skips this. Body text. Then the linked Quest card under "From this trip": cover, title, "5 pages · 15 photos" and "View Quest". Then the like and comment counts (likes below 3 show "Be the first to like this", as on Quests), comments with newest last, and "Add a comment". Last, a "Write your own" card. Comments off: "Comments are off for this blog."

**B6. Profile with Blogs.** Under the counts, a switch: Quests · Blogs. Blogs is a one-column list: cover thumbnail (or a plain tile with no photos), title, the first line of text, "4 min read" and likes. The count row stays as it is (Quests, Followers, Following); blogs aren't counted there. Your own profile also lists drafts and unlisted or private blogs, with tags, and the Quests tab (screen 20) gets the same switch. Empty on your own: "No blogs yet. Write about a trip." with "Write a blog". Empty on others': the switch is hidden.

[Wireframes B4 to B6: post and share, blog page, profile with Blogs — see the doc]

**B7. Feed card (S2).** Like a Quest card, but text-led: writer row, a "Blog" tag, title, two lines of text, the cover photo if there is one, then like, comment and share.

**B8. Explore (S3).** Stories and guides now shows public blogs too, next to OnQuest guides, each with "Blog · 4 min read · by @username". Search results group blogs under Stories.

## Acceptance criteria

| Story | Given | When | Then |
| --- | --- | --- | --- |
| B1 | I'm signed in on Home | I tap Create, then "Write a blog" | The composer opens with the cursor in Title; no "Releasing soon" message shows |
| B2 | The composer has a title and no text or photos | I tap Post | It doesn't post and shows "Add a title and some text or a photo." |
| B2 | I paste a 120-character title | I look at the field | It keeps the first 100 characters and the counter shows 100 / 100 |
| B3 | I've added 10 photos | I try to add an 11th | It isn't added and I see "A blog holds 10 photos." |
| B3 | I've added 4 photos | I drag the third to the front | It becomes the cover in Preview and on the profile card |
| B4 | I have 2 published Quests | I tap Link a Quest and choose "3 days in Goa" | The row shows the Goa card, and the posted blog ends with it under "From this trip" |
| B4 | I've published no Quests | I tap Link a Quest | I see "You haven't published a Quest yet." and Create a Quest |
| B5 | I've written a title and two paragraphs | I close the app and open the Quests tab, Blogs | The draft is there with "Continue editing" and all my text |
| B6 | Any draft | I tap Preview | I see the blog as a reader would, with "Back to edit" and Post |
| B7 | I post as Unlisted | A signed-out friend opens the link | The blog shows; it isn't on my profile, in the feed or in search |
| B7 | I post as Private | A signed-out friend opens the link | They see "This blog is private." and nothing else |
| B8 | A public blog link | A signed-out reader opens it on a phone over 4G | The title and text show without a sign-in prompt |
| B9 | A blog linked to a public Quest | A reader taps View Quest | The Quest opens, and Back returns to the same spot in the blog |
| B9 | The linked Quest is later made private or deleted | Someone else opens the blog | The Quest card is gone; nothing else changes. The writer sees "Your linked Quest isn't visible to readers" |
| B10 | I'm signed out on a blog | I tap like and sign in | I'm back on the same blog with the like counted |
| B11 | I delete a posted blog | Anyone opens its old link | They see "This blog was removed." |
| B11 | I turn comments off | A reader opens the blog | Existing comments are hidden and it says "Comments are off for this blog." |
| B12 | Aman has 2 public blogs and 1 unlisted | I open his profile and tap Blogs | I see the 2 public ones |
| B13 | Someone comments on my blog | Within 1 minute | The bell shows it, with the blog's title |

## Edge cases

| Case | Expected behaviour |
| --- | --- |
| Text only, no photos | Allowed; the page and cards show no empty gallery; the profile shows a plain tile with the first letter of the title |
| Photos only, a one-line text | Allowed; the gallery leads the page |
| 10 photos and 10,000 characters | The page loads the text first, then photos as the reader scrolls |
| Linked Quest is unlisted | Readers who can see the blog see the card and can open the Quest by it, as they could by its link |
| Linked Quest is private | Only the writer sees the card |
| Pasted links in the text | Shown as plain text that can be tapped; no link previews |
| Pasted formatting from another app | Kept as plain text with paragraphs |
| Going offline while writing | Typing keeps working; "Saved" changes to "Not saved yet. You're offline." and saves when back online; photos keep uploading when back online |
| A photo fails to upload 3 times | It shows Retry and Remove; Post waits until it uploads or is removed |
| Two tabs editing the same draft | The later save wins, and the other tab shows "This draft was changed somewhere else. Reload." |
| Very large or HEIC photos | Accepted, shrunk before upload |
| Same title as an existing blog of mine | Allowed; the link gets a number at the end (blog-title-2) |

## Privacy, visibility and existing content

- Public, Unlisted and Private work as they do for Quests. Only public blogs appear on profiles, in the feed, in Explore and in search.
- A blog never makes a linked Quest more visible than it already is.
- Like Quests, view counts are for the OnQuest team only. Likes are anonymous; comments show the name and photo.
- Photos keep no exact location. Only a place name chosen by the writer is shown.
- Deleting the account deletes the user's blogs, drafts, photos, likes and comments, as for Quests.

**Existing content.** Nothing to migrate: there are no blogs yet. Quests, profiles, drafts and shared Quest links don't change. Profiles gain the Quests · Blogs switch, shown only when someone has a public blog, so profiles without blogs look exactly as today.

## UX test plan

The founder runs these on a real phone against the preview build. All must pass before code review.

1. **Write a blog with photos and a Quest.** From Create, write a title and three paragraphs, add 4 photos, link a Quest, preview and post as Public. Pass: under 10 minutes, the blog shows on your profile, and the Quest card opens the Quest.
2. **Leave and come back.** Start a blog, close the app mid-sentence, reopen. Pass: the draft is in Your Quests, Blogs with every word.
3. **Be the reader.** On a second phone, signed out, open the link from WhatsApp, read to the end, tap View Quest, go back, like (sign in), comment. Pass: no sign-in to read, back keeps your place, and after sign-in you're on the same blog.
4. **Edit and manage.** Change a paragraph, remove a photo, make it Unlisted, turn comments off, then delete. Pass: each change shows on the shared link; after delete the link says "This blog was removed."
5. **Text only.** Post a blog with no photos and no Quest. Pass: no empty boxes anywhere.

## Analytics

These events are added to the OnQuest Taxonomy sheet in the same pass as the prototype change, with the same rules: no user text, titles, emails, photo links or exact locations in any property. Server events are the source of truth for counts.

| Event | When | Properties |
| --- | --- | --- |
| blog_create_started | "Write a blog" tapped | source: create, write_your_own |
| blog_draft_saved | A draft saves (server, at most once a minute) | chars_bucket, photos |
| blog_quest_linked | A Quest is linked or removed | action: link, remove |
| blog_previewed | Preview tapped | none |
| blog_published | Post confirmed | visibility, photos, chars_bucket, has_quest, has_place, minutes_since_start |
| blog_viewed | A blog page opens | signed_in, referrer, has_quest; an anonymous visitor ID when signed out |
| blog_read_end | The reader reaches the end of the text | seconds |
| blog_quest_opened | View Quest tapped on a blog | none |
| blog_liked | Like tapped | none |
| blog_comment_posted | Comment sent | none |
| blog_managed | A change from the blog's ⋯ menu | action: edit, visibility, comments, delete; value |

## Out of scope

- Rich text editor beyond C1, embedded videos, audio and link previews
- More than one linked Quest, or linking other people's Quests
- Co-writing a blog
- Reporting blogs or comments, and blocking (same as Quests in the MVP)
- Paid posts, sponsored blogs and affiliate links
- Upvotes and downvotes, Reddit-style communities or subreddits ("like Reddit" here means the writing screen and post layout)
- OnQuest staff guides change nothing: they stay as they are

## Open questions

**For the founder**

- [x] Is the 10-photo cap right, and the 10,000-character limit? Decided 23 Nov 2026: yes, both.
- [x] Can a blog link only your own Quests, or any public Quest? Decided 23 Nov 2026: only your own Quests.
- [x] Is S4, "Write about this trip" from a Quest, a Must? Decided 23 Nov 2026: not now. Later, as a suggestion tooltip after the Quest-published celebration.
- [x] Should public blogs from everyone show in Explore's Stories (S3), or only OnQuest guides and blogs from people you follow? Decided 23 Nov 2026: public blogs from everyone.
- [x] Should the profile count row show Blogs next to Quests, Followers and Following? Decided 23 Nov 2026: no.
- [x] Is the link format onquest.in/@username/blog/blog-title right? Decided 23 Nov 2026: yes.
- [x] Do the proposed targets hold? Decided 23 Nov 2026: no targets for now; metrics are tracked only.

**For the Tech Lead**

- [ ] Draft saving as you type, offline, and the two-tab conflict, under decision 0001
- [ ] Blog links next to Quest links under /@username without clashing with Quest titles
- [ ] Reusing the Quest photo upload, likes, comments and notifications for blogs
- [ ] Search and Explore indexing for blog text
- [ ] SEO for public blogs: metadata, sitemap and index or noindex for unlisted
- [ ] Read-through (blog_read_end) measured the same way on all phones

## Rollout

Behind a feature flag. The founders first, then friends-test users. The Create chooser shows "Write a blog" as active only for users with the flag; everyone else keeps the "Releasing soon" placeholder.
