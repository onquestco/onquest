# Final template designs: what changed (25 Nov 2026)

The founder's final design files were copied verbatim from the claude.ai artifacts. The earlier copies had a one-line `<!-- Design source: … -->` comment on line 2. The verbatim copies don't have it, so this file now records where each one came from.

## Versions

| File | Artifact | Old version | Final version |
|---|---|---|---|
| `templates/coastal.html` | https://claude.ai/artifact/USqXDdZZQQyZjWQNrVf4qN | 1795460914-59ad | **1795615721-c26e** |
| `templates/mountain.html` | https://claude.ai/artifact/N4ukoN4vp8Yr9HQynsRWD9 | 1795461348-4692 | **1795615723-a754** |
| `templates/roadtrip.html` | https://claude.ai/artifact/5xUy6ZFzsqPkZue72syTGT | 1795461839-973f | **1795615724-0ae5** |
| `templates/winter.html` (new; `winter.md` is superseded) | https://claude.ai/artifact/5sGKHMSZhueqDBn7RsWeYP | 1795461847-f417 | **1795615725-b9fa** |
| `templates/monsoon.html` (new; `monsoon.md` is superseded) | https://claude.ai/artifact/2H4WTEdxhoPzZFFxTydyX9 | 1795462002-3028 | **1795615726-14d3** |
| `templates/desert.html` (new; `desert.md` is superseded) | https://claude.ai/artifact/92ZUhdmomd6QfpHTUzhDSS | 1795461841-e299 | **1795615728-b03b** |
| `year-recap.html` (new) | https://claude.ai/artifact/HKKAwnjgb6K7gbPuVV58EC | (none in repo) | **1795615104-012c** |

How each file was compared:
- Coastal, mountain and roadtrip: `git diff` against the previous copies.
- Winter, monsoon and desert: I checked the THEME, defs and theme-CSS blocks of each old `.md` line by line against the new HTML. I also diffed the new file against `roadtrip.html`, because each `.md` says its shared player is the same as Roadtrip's.

## 1. Shared player CSS (identical in all six templates)

Every template gets the same two blocks, added at the end of `<style>`. Before this, none of the templates had them.

### "Calm backgrounds so photos pop"

```css
.bg{filter:blur(1.1px) saturate(.72);transform:scale(1.03)}
.stage:not(.light) .bg{opacity:.6}
.stage:not(.light) .kicker{filter:brightness(.74) saturate(1.15)}
.stage.light .bg{filter:blur(1.1px) saturate(.78) brightness(.93)}
.polaroid{box-shadow:0 1.6cqw 4.2cqw rgba(15,25,35,.42),0 0 0 .25cqw rgba(0,0,0,.05)!important}
```

- **Background, all pages:**
  - blur: none → `1.1px`
  - saturate: 1 → `.72` (`.78` on `.light` pages, which also get brightness 1 → `.93`)
  - scale: 1 → `1.03` (the scale hides the blurred edges)
- **Background opacity on pages without `.light`:** 1 → `.6`. The stage colour (`--paper`, or `--bg` in Coastal) shows through. `.light` pages keep opacity 1.
- **Kicker on pages without `.light`:** no filter → `brightness(.74) saturate(1.15)`, so it gets darker.
- **Polaroid shadow:** now the same everywhere and forced with `!important`. Before → after:
  - Coastal: `0 1.2cqw 3cqw rgba(16,58,74,.28)` → `0 1.6cqw 4.2cqw rgba(15,25,35,.42), 0 0 0 .25cqw rgba(0,0,0,.05)`
  - Mountain: `0 1.2cqw 3cqw rgba(37,56,46,.32)` → same as above
  - Roadtrip, Winter, Monsoon, Desert: `0 1.2cqw 3cqw rgba(0,0,0,.3)` → same as above

### "Softer text"

```css
.title,.pageTitle{zoom:.88}
.kicker{zoom:.92}
.meta{zoom:.94}
.polaroid .cap{zoom:.93}
.light .title,.light .pageTitle,.night .title,.night .pageTitle{text-shadow:0 .3cqw 1cqw rgba(0,0,30,.22)}
```

- **Zoom:**
  - title and pageTitle ×0.88
  - kicker ×0.92
  - meta ×0.94
  - polaroid caption ×0.93
  - The stamp (`.stamp b` 8cqw, `.stamp span` 2.6cqw) is **unchanged**.
- **Effective sizes, before → after, in cqw:**

| Template | title | pageTitle | kicker | meta | caption |
|---|---|---|---|---|---|
| Coastal | 13 → 11.44 | 8 → 7.04 | 6 → 5.52 | 3.6 → 3.384 | 5.6 → 5.208 |
| Mountain | 11.5 → 10.12 | 6.4 → 5.632 | 6.4 → 5.888 | 3.4 → 3.196 | 5.6 → 5.208 |
| Roadtrip | 12.5 → 11.0 | 7.4 → 6.512 | 4.2 → 3.864 | 3.4 → 3.196 | 5.6 → 5.208 |
| Winter | 13.5 → 11.88 | 10.5 → 9.24 | 7 → 6.44 | 3.4 → 3.196 | 5.6 → 5.208 |
| Monsoon | 11.5 → 10.12 | 6.2 → 5.456 | 3.8 → 3.496 | 3.4 → 3.196 | 5.6 → 5.208 |
| Desert | 12 → 10.56 | 7.4 → 6.512 | 3.8 → 3.496 | 3.4 → 3.196 | 5.6 → 5.208 |

- **Title and pageTitle shadow on `.light` and `.night` pages:**
  - Coastal `.light`: `0 .6cqw 2cqw rgba(6,70,92,.5)` → `0 .3cqw 1cqw rgba(0,0,30,.22)`
  - Mountain `.night`: `0 .5cqw 1.6cqw rgba(0,0,20,.5)` → `0 .3cqw 1cqw rgba(0,0,30,.22)`
  - Shared player `.light` (Roadtrip, Winter, Monsoon, Desert): `0 .5cqw 1.6cqw rgba(0,0,30,.35)` → `0 .3cqw 1cqw rgba(0,0,30,.22)`
  - The `.meta` shadow is unchanged.

### Shared `cover()` (Roadtrip, Winter, Monsoon, Desert)

`cover()` is now one function with two new options:
- `THEME.single`: one polaroid at `(14, 47, w 60)` and the stamp at `(70, 88, w 24)`.
- `THEME.cs===false`: no cover sticker.

Before, these were Monsoon-only differences. The output doesn't change for any template:
- Roadtrip and Winter set neither option and keep three polaroids, stamp `(68, 82, w 26)` and the default sticker `S[3](72, 6, 20)`.
- Monsoon sets `single:true, cs:false`, with the same values as its old `.md`.
- Desert keeps `cs:[1,76,5,14]`.

## 2. Per template

All page positions, polaroid layouts, stamps, stickers, routes and every background SVG (colours, opacities, elements) are **unchanged** in all six templates. Only section 1 applies, plus the following.

- **Coastal:**
  - No other changes.
  - The cover and the Day 2 page (`i%2===1`) are `.light`: full-opacity sea backgrounds with brightness .93.
  - Day 1, Day 3 and the route page are not `.light`: background at opacity .6 over `--bg`/`--paper` `#FFF8E1`, with a darker kicker.
- **Mountain:**
  - No other changes.
  - No Mountain stage ever has `.light`, so **every** background (mist, forest, sunrise and night) now shows at opacity .6 over `#F8F5EA`. That includes the dark night sky (`skyNight` `#16213E → #6E7FB0`), which will look much paler.
  - The night page's kicker (`#FFD9A8`) also gets the darkening filter.
  - Still unfixed: `url(#glare)` is used on the sunrise and night pages but is not defined in the defs.
- **Roadtrip:**
  - Title fill: `#F28C1B` → `#D9680C`
  - Title stroke: `.7cqw #7A3B0C` → `.3cqw #7A3B0C`
  - pageTitle fill: `#F28C1B` → `#D9680C`
  - pageTitle stroke: `.45cqw #7A3B0C` → `.2cqw #7A3B0C`
  - Stroke of `.light` title and pageTitle: `.45cqw #4A2A12` → `.2cqw #4A2A12`
  - Only `night` is `.light`. The day, sunset and hills backgrounds are now at opacity .6 over `#BFE3F8`.
- **Winter:**
  - Theme CSS, defs and THEME are the same as `winter.md`.
  - Every kind is `.light`, so the backgrounds keep opacity 1, with blur, saturate .78 and brightness .93.
- **Monsoon:**
  - Theme CSS, defs, THEME and backgrounds are the same as `monsoon.md`.
  - Two small differences from the `.md`:
    - `.note{color:#fff}` is in the theme CSS. It styles the page's own caption above the player, and the `.md` may have left it out on purpose.
    - `band()` now declares an unused `const d=…`. Its output is unchanged.
  - The `sky` and `umbrella` kinds are not `.light`. Their pale backgrounds now sit at opacity .6 over the dark `--paper` `#0F3A63`, so they come out darker. Check the contrast of the dark `--ink` `#0F3A63` titles there.
- **Desert:**
  - Theme CSS, defs, THEME, stickers and backgrounds are the same as `desert.md`.
  - The `dunes`, `sun` and `dusk` backgrounds are now at opacity .6 over `#EAD7AC`. `night` is `.light`.

## 3. Year recap (`year-recap.html`)

This is the first copy in the repo, so there's nothing to diff against. **I couldn't compare it with the tripp Project's `claude/onquest-year-recap-template.html`.** That file isn't reachable from this session, and there's no copy in the repo or on disk.

What the file itself shows:
- It ends with a block called "calm backgrounds so photos pop". It has the same values as the templates, but uses `.slide` selectors:
  - `.bg` blur 1.1px, saturate .72, scale 1.03
  - `.slide:not(.light) .bg` opacity .6
  - `.slide.light .bg` saturate .78, brightness .93
  - the same polaroid shadow with `!important`. Before it, the recap's own polaroid shadow was `0 1.2cqw 3cqw rgba(37,56,46,.34)`.
- This block is very likely the change against the Project source.
- There is **no** kicker filter and **no** "softer text" block, so recap text sizes keep the values in the file.
- Only the `shore` and `night` slides are `.light`. All other slides show their backgrounds at opacity .6 over `#F6EAD0`.
- The slide order and backgrounds match the PRD (`docs/prds/year-recap.md` §6 on `spec/year-recap`): paper, sand, shore, mist, dusk, night, forest, desert, kraft.
- One difference from the PRD:
  - The design's share button copies a text summary ("Copied!").
  - The PRD says the share sheet, or "Link copied".
