import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { colors, type ColorToken } from './tokens';
import { renderTokensCss } from './tokensCss';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: ColorToken, background: ColorToken): number {
  const [light, dark] = [luminance(colors[foreground]), luminance(colors[background])].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

describe('design tokens', () => {
  it('tokens.css matches tokens.ts (run `npm run tokens` after changing tokens)', () => {
    const generated = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
    expect(generated).toBe(renderTokensCss());
  });

  // The pairs the design system promises are readable (4.5:1 for text, 3:1 for control edges).
  it.each([
    ['ink', 'surface', 4.5],
    ['ink', 'surface-page', 4.5],
    ['ink', 'brand-wash', 4.5],
    ['ink-muted', 'surface', 4.5],
    ['ink-muted', 'surface-page', 4.5],
    ['on-brand', 'brand-strong', 4.5],
    ['brand-strong', 'surface', 4.5],
    ['danger', 'surface', 4.5],
    ['success', 'surface', 4.5],
    ['line-control', 'surface', 3],
  ] as const)('%s on %s is at least %s:1', (foreground, background, minimum) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum);
  });
});
