# Design system (app screens)

The only source of app colours, fonts, type styles and radii (decision 0002). Design decisions are made on the OnQuest design system page in claude.ai (https://claude.ai/artifact/54mpY7RB6L2atZGyEfx9GR); `tokens.ts` mirrors it.

| File | What |
| --- | --- |
| `tokens.ts` | Every token, typed, with when to use it. `color('ink')` for raw values. |
| `tokens.css` | Generated Tailwind `@theme` (run `npm run tokens`). Don't edit. |
| `fonts.ts` | Inter via next/font, set on `<html>`. |
| `components/` | `Button` (+ `buttonClassName()` for links), `TextField`, `Logo`. |
| `../public/brand/` | The logo files. |

## Using it

- Colours: `bg-surface`, `bg-surface-page`, `text-ink`, `text-ink-muted`, `border-line`, `border-line-control`, `bg-brand-strong text-on-brand`, `text-danger`, `text-success`. `brand` is for big highlight words only.
- Type: `text-title`, `text-lead`, `text-body`, `text-label`, `text-caption` (size, line height and weight together). Inputs are always `text-body`.
- Radii: `rounded-sm` (inputs, rows), `rounded-md` (small cards), `rounded-lg` (Quest cards), `rounded-pill` (buttons, chips).
- Spacing: Tailwind's scale (`p-4` = space-4 = 16px). Phone gutter `px-4`, between cards `gap-6`, between sections `gap-8`.
- One primary button per screen; 44px tap targets; no shadows; focus ring `brand-strong`.

## Adding or changing a token

1. Change it on the claude.ai design system page.
2. Change `tokens.ts` the same way, with a usage comment.
3. Run `npm run tokens` and commit `tokens.css`.

Raw colours or fonts anywhere in `app/`, `features/` or `lib/` fail `noRawStyles.test.ts`. Templates keep their own look and never import from here.
