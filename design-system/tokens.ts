/**
 * OnQuest design tokens: the one place app colours, fonts, type sizes and radii are defined.
 *
 * This file mirrors the OnQuest design system page in claude.ai
 * (https://claude.ai/artifact/54mpY7RB6L2atZGyEfx9GR). Change a value there and here in the same PR,
 * then run `npm run tokens` to regenerate `tokens.css` (a test fails if you forget).
 *
 * App code uses tokens through Tailwind classes (`bg-brand-strong`, `text-ink`, `text-title`,
 * `rounded-pill`) or, where a raw value is unavoidable (OG images, `<meta name="theme-color">`),
 * through `color('brand-strong')`. Scrapbook templates keep their own palettes and fonts in
 * `templates/<name>/theme.ts` and `fonts.ts` and never import this file (decision 0002).
 */

export const colors = {
  /** OnQuest orange. Highlight words and large display accents only: white on it is 3.38:1. */
  brand: '#ea6100',
  /** The logo's orange. Logo files only; never UI fills or text. */
  'brand-bright': '#ff6900',
  /** Hover tint for large brand surfaces; never a resting colour. */
  'brand-hover': '#f86f0a',
  /** The accessible orange: primary buttons (white text 4.73:1), links, focus rings, selected chips. */
  'brand-strong': '#c25000',
  /** The light logo's "uest" and pin. Logo files only; use `ink` for text. */
  'logo-brown': '#402b09',
  /** Contour-line strokes and soft decorative fills. `ink` reads on it at 12.17:1. */
  'brand-tint': '#f7ceb0',
  /** Quiet highlight rows and selected list items, with `ink` text (15.76:1). */
  'brand-wash': '#fdefe5',
  /** Text and icons on `brand-strong` fills. */
  'on-brand': '#ffffff',
  /** Cards, inputs, sheets, the editor canvas. */
  surface: '#ffffff',
  /** App page background behind cards. */
  'surface-page': '#f9fafb',
  /** Primary text and headings (17.74:1 on white). */
  ink: '#111827',
  /** Secondary text, field labels, meta lines (10.31:1). */
  'ink-muted': '#374151',
  /** Placeholders and disabled labels only (2.54:1): never information a person must read. */
  'ink-subtle': '#9ca3af',
  /** Dividers and decorative outlines. Too light (1.47:1) to be a control's only edge. */
  line: '#d1d5db',
  /** Borders of inputs and secondary buttons (4.83:1 on surface). */
  'line-control': '#6b7280',
  /** Dark landing sections and photo overlays, with `on-night` text. */
  night: '#000000',
  /** The deep brown announcement band, with `on-night` text. Sparingly. */
  'night-band': '#210d0d',
  /** Text on `night`, `night-band` and dark photo overlays. */
  'on-night': '#ffffff',
  /** Meta lines over dark photo overlays (white at 80%). */
  'on-night-muted': '#ffffffcc',
  /** Landing-page decoration only. Not used in the app. */
  'accent-blue': '#3b82f6',
  /** Landing-page decoration only. Not used in the app; nothing readable sits on it. */
  'accent-green': '#22c55e',
  /** Letter avatars (a person without a photo), picked by name, with `on-brand` text. From the prototype. */
  'avatar-1': '#3c8dbc',
  'avatar-2': '#7cb342',
  'avatar-3': '#5f7f63',
  'avatar-4': '#d9534f',
  'avatar-5': '#c25000',
  /** Errors and destructive actions, always with words (6.47:1 on surface). */
  danger: '#b91c1c',
  /** Confirmations ("Link copied"), always with words (5.02:1 on surface). */
  success: '#15803d',
} as const;

export type ColorToken = keyof typeof colors;

/** A colour's raw value, for the few places that can't use a Tailwind class. */
export function color(name: ColorToken): string {
  return colors[name];
}

/**
 * Font stacks. `--font-inter` is set by `design-system/fonts.ts` (next/font, self-hosted),
 * so the app never calls Google Fonts at runtime.
 */
export const fontFamilies = {
  sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
  /** The prototype's handwritten touch ("Hi Riya" on Home), used sparingly. */
  handwritten: ['var(--font-caveat)', 'Caveat', '"Segoe Print"', 'cursive'],
} as const;

type TextStyle = {
  size: string;
  lineHeight: string;
  weight: number;
  letterSpacing?: string;
};

/**
 * Type styles, used as `text-<name>` (size, line height and weight together).
 * App screens use title, lead, body, label and caption; display and headline are for the landing page.
 * Inputs are always `body` so phones don't zoom in.
 */
export const textStyles = {
  display: { size: '72px', lineHeight: '1.1', weight: 700, letterSpacing: '-1.8px' },
  headline: { size: '48px', lineHeight: '1.1', weight: 700 },
  title: { size: '24px', lineHeight: '32px', weight: 700 },
  lead: { size: '18px', lineHeight: '28px', weight: 500 },
  body: { size: '16px', lineHeight: '24px', weight: 400 },
  label: { size: '14px', lineHeight: '20px', weight: 500 },
  caption: { size: '12.8px', lineHeight: '1.25', weight: 400 },
} as const satisfies Record<string, TextStyle>;

export type TextStyleToken = keyof typeof textStyles;

/** Corner radii, used as `rounded-<name>`. Buttons and chips are pills; inputs `sm`; Quest cards `lg`. */
export const radii = {
  sm: '8px',
  md: '12px',
  lg: '24px',
  pill: '9999px',
} as const;

/**
 * Shadows, used as `shadow-<name>`, from the clickable prototype (founder, 11 Nov). Only for things
 * that float: buttons over photos, the raised Create button, photo fans, the selected segment.
 * Cards and rows still separate with space and `line`, not depth.
 */
export const shadows = {
  /** Round buttons over a photo or a Quest (Back, ⋯, full screen, gear). */
  float: '0 2px 6px #00000033',
  /** Polaroid-style photos in fans and piles. */
  photo: '0 8px 18px -10px #00000073',
  /** The raised orange Create button and the main Create card. */
  brand: '0 6px 14px -6px #c25000',
  /** The selected option in a segmented control. */
  select: '0 1px 3px #00000033',
} as const;

/**
 * Spacing: the design system's space-1 … space-8 are 4px steps, which is Tailwind's own spacing scale
 * (`p-4` = 16px = space-4). Use space-4 for the phone gutter, space-6 between cards and space-8
 * between sections of a screen.
 */
export const spacingUnit = '4px';
