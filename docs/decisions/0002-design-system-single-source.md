# 0002: The design system is the single typed source of app colours and fonts

- **Status:** Accepted (founder, 9–10 Nov 2026)
- **Applies to:** every app screen (everything outside `templates/`)

## Decision

1. `design-system/tokens.ts` is the only place in the code where app colours, font stacks, type styles and radii are defined. It mirrors the OnQuest design system page in claude.ai (https://claude.ai/artifact/54mpY7RB6L2atZGyEfx9GR), which is where design decisions are made. A change lands in both, in one PR.
2. `design-system/tokens.css` is generated from `tokens.ts` (`npm run tokens`) into Tailwind's `@theme`. It resets Tailwind's default palette, fonts, sizes, radii and shadows, so only token classes exist: `bg-brand-strong`, `text-ink`, `text-title`, `rounded-pill`. A test fails if the CSS is out of date.
3. App code uses tokens through those classes, through `design-system/components/` (Button, TextField, Logo), or, where a raw value is unavoidable (OG images, `theme-color`), through `color('brand-strong')`, which only accepts token names.
4. No hex values, colour functions, Tailwind palette classes, arbitrary values (`p-[13px]`), default text sizes or font families anywhere in `app/`, `features/` or `lib/`. `design-system/noRawStyles.test.ts` enforces this in CI.
5. Fonts load once, in `design-system/fonts.ts` (Inter via next/font, self-hosted).
6. Scrapbook templates keep their own palettes and fonts in `templates/<name>/theme.ts` and `fonts.ts` and never import `design-system/`. Inside a Quest page the template wins; outside it the design system wins.
7. Spacing is Tailwind's 4px scale, which is the design system's space-1 … space-8.

## Why

The founder wants one place to add or change a colour, with every use typed and imported, so screens can't drift from the design system and a rebrand is one edit.

## Consequences

- A new colour or size starts as a design-system change (claude.ai page and `tokens.ts`), never as a one-off value in a screen.
- `docs/design-system/` copies of the tokens (from the earlier Frontend-agent patch) are not a second source: the Frontend agent reads `design-system/` in code.
- Demo placeholder illustrations (`lib/demo/placeholderImages.ts`) are drawings, not UI, and are exempt.
