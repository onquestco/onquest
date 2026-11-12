# 0003: Town and captions from the photos themselves

Status: accepted (founder, 12 Nov 2026)

## Context

Spec A wrote captions only for photos with a place, and found places only from photo GPS. On a
real test (Android, Chrome) every photo arrived with its date but without GPS: Android removes
location from any photo a website picks, and iPhones do too unless the person turns on
Location in the picker's Options. So almost no Quest made on a phone got a place or a caption.

## Decision

1. While "Arranging your Quest", the browser tiles up to 15 photo previews into one numbered
   1024 px JPEG collage (`features/editor/collage.ts`). The `describeQuest` server action sends it,
   with each tile's date only, to Claude Haiku (`lib/photoCaptions.ts`), which answers with the town
   (only when a landmark or scene makes it clear, otherwise null) and one caption per tile.
   One image instead of 15 is about half the cost (under ₹1 per Quest). The collage isn't stored.
2. The town, when the draft has no place from GPS, is looked up with the geocoder and given to
   every photo; automatic page titles and the Quest title follow. Captions go only on photos
   without one, marked automatic.
3. If the collage gives nothing, photos with a GPS place still get town-only captions (as before).
4. No "Where was this trip?" question (it isn't in the prototype; founder, 12 Nov): when the
   collage can't tell, the Quest simply has no town, and the photo sheet's town search still works.
5. Pick photos tells iPhone users to turn on Location in the picker's Options.
6. The model is told never to identify people or read out private text.
7. The privacy policy (12 Nov 2026) says a collage goes to Anthropic.

This replaces spec A M4's "no location, no caption" and the privacy line that photos never go to
Anthropic.
