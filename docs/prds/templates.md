# New scrapbook templates

Nov 25, 2026 · Draft from the founders' decisions in chat (Swati, CTO). QuestLog OQ-9. **Alok to confirm.**

## What

Six new scrapbook looks, designed by the founder as interactive previews (cover, three day pages, route page; each page has its own background):

| Template | Design (claude.ai artifact) | Repo copy |
| --- | --- | --- |
| Coastal | https://claude.ai/artifact/USqXDdZZQQyZjWQNrVf4qN | `docs/reference/templates/coastal.html` |
| Mountain | https://claude.ai/artifact/N4ukoN4vp8Yr9HQynsRWD9 | added when built |
| Roadtrip | https://claude.ai/artifact/5xUy6ZFzsqPkZue72syTGT | added when built |
| Winter | https://claude.ai/artifact/5sGKHMSZhueqDBn7RsWeYP | added when built |
| Monsoon | https://claude.ai/artifact/2H4WTEdxhoPzZFFxTydyX9 | added when built |
| Desert | https://claude.ai/artifact/92ZUhdmomd6QfpHTUzhDSS | added when built |

## Decisions (23–25 Nov 2026)

1. **Existing Quests keep their look.** Quests already made with Beach or the current Mountain keep rendering exactly as today (and their Instagram export). Nothing about a published page changes.
2. **New Quests get the new designs.** The template choice for new Quests shows the new templates; Coastal replaces Beach and the new Mountain replaces the old Mountain *as choices*. Old Beach/Mountain stay in the code for existing Quests only.
3. **One template at a time.** Build, phone-test and ship each before the next. Order: Coastal first (it replaces the default), then Mountain, Roadtrip, Winter, Monsoon, Desert.
4. The sample trip and illustrations in the designs are stand-ins: real Quests use the writer's photos, titles, dates, places, captions and route.
5. Instagram export uses the template's own pages (as since 21 Nov), with the small link.

## Must

- Template picker (create flow) shows only the new templates once each is live; a draft that already chose Beach/old Mountain keeps it.
- Every page works with 1, 2 or 3 photos, missing captions, no place, no route (fewer than 2 places): nothing missing is drawn, no empty boxes.
- Text is server-rendered; fonts self-hosted via next/font; animations respect reduced motion.
- Small trip (1 day / 3 photos) and big trip (5 pages / 15 photos) both look right on a phone and on desktop.

## Out of scope

Changing existing Quests' look; letting people switch an existing Quest to a new template (later).

## Questions for the Tech Lead

- Designs use a 9:15 page; the current Stage is 9:14. Keep 9:14 for all templates, or allow per-template ratios (export and player impact)?
- How to mark old Beach/Mountain as "existing Quests only" in the registry without breaking `TemplateId` or old drafts.
- Background SVG filters (turbulence) and their cost on low-end phones and in the export capture.
