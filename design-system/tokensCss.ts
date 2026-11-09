import { colors, fontFamilies, radii, spacingUnit, textStyles } from './tokens.ts';

/**
 * Turns the tokens into a Tailwind v4 `@theme` block. Each namespace is reset first, so Tailwind's
 * default palette, fonts, sizes and radii don't exist in this app: `bg-slate-800` simply doesn't
 * work, and every class comes from a token.
 */
export function renderTokensCss(): string {
  const lines = [
    '/* Generated from design-system/tokens.ts by `npm run tokens`. Do not edit by hand. */',
    '',
    '@theme {',
    '  --color-*: initial;',
    '  --font-*: initial;',
    '  --text-*: initial;',
    '  --radius-*: initial;',
    // The app has no shadows: things are separated with space and `line`, not depth.
    '  --shadow-*: initial;',
    `  --spacing: ${spacingUnit};`,
    '',
  ];

  for (const [name, value] of Object.entries(colors)) lines.push(`  --color-${name}: ${value};`);
  lines.push('');

  for (const [name, stack] of Object.entries(fontFamilies)) lines.push(`  --font-${name}: ${stack.join(', ')};`);
  lines.push('');

  for (const [name, style] of Object.entries(textStyles)) {
    lines.push(`  --text-${name}: ${style.size};`);
    lines.push(`  --text-${name}--line-height: ${style.lineHeight};`);
    lines.push(`  --text-${name}--font-weight: ${style.weight};`);
    if ('letterSpacing' in style) lines.push(`  --text-${name}--letter-spacing: ${style.letterSpacing};`);
  }
  lines.push('');

  for (const [name, value] of Object.entries(radii)) lines.push(`  --radius-${name}: ${value};`);

  lines.push('}', '');
  return lines.join('\n');
}
