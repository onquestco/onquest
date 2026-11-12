import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Decision 0002: colours and fonts are defined only in design-system/ (app) and in each template's
// own folder (scrapbook looks). Everything else imports them, so a raw value anywhere else is a bug.

const root = join(import.meta.dirname, '..');
const checkedFolders = ['app', 'features', 'lib'];
// Demo placeholder "photos" are drawn illustrations, not UI colours.
const allowedFiles = ['lib/demo/placeholderImages.ts'];
const extensions = ['.ts', '.tsx', '.css'];

const rules: { name: string; pattern: RegExp }[] = [
  { name: 'hex colour', pattern: /(?<![\w&/])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i },
  { name: 'colour function', pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/ },
  { name: 'named CSS colour', pattern: /:\s*(?:white|black|red|orange|gray|grey)\s*[;}]/ },
  {
    name: 'Tailwind palette class',
    pattern:
      /\b[a-z-]*(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|placeholder|accent|caret|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?\b/,
  },
  { name: 'Tailwind arbitrary value', pattern: /\b[a-z-]+-\[[^\]]+\]/ },
  { name: 'Tailwind default size or font class', pattern: /\b(?:text-(?:xs|sm|base|lg|[2-9]?xl)|font-(?:serif|mono))\b/ },
  { name: 'font family', pattern: /font-family|fontFamily|next\/font/ },
];

function filesIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return filesIn(path);
    return extensions.some((extension) => name.endsWith(extension)) ? [path] : [];
  });
}

const files = checkedFolders
  .flatMap((folder) => filesIn(join(root, folder)))
  .map((path) => relative(root, path))
  .filter((path) => !allowedFiles.includes(path) && !path.endsWith('.test.ts'));

describe('no raw colours or fonts outside the design system', () => {
  it.each(files)('%s', (path) => {
    const problems = readFileSync(join(root, path), 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        rules.filter((rule) => rule.pattern.test(line)).map((rule) => `line ${index + 1}: ${rule.name}: ${line.trim()}`),
      );
    expect(problems, 'Use a token from design-system/tokens.ts instead').toEqual([]);
  });
});

describe('templates keep their own look', () => {
  it('no template imports the app design system', () => {
    const offenders = filesIn(join(root, 'templates')).filter((path) =>
      readFileSync(path, 'utf8').includes('@/design-system'),
    );
    expect(offenders.map((path) => relative(root, path))).toEqual([]);
  });
});
