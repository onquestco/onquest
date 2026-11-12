import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toGuide } from './guideSchema';

// Every guide in content/guides must parse, match its file name and have its image (spec C §3.6):
// a broken guide fails CI, not a page.
const dir = join(process.cwd(), 'content', 'guides');
const files = readdirSync(dir).filter((file) => file.endsWith('.md'));

describe('content/guides', () => {
  it.each(files)('%s', (file) => {
    const guide = toGuide(readFileSync(join(dir, file), 'utf8'));
    expect(`${guide.slug}.md`).toBe(file);
    expect(existsSync(join(process.cwd(), 'public', guide.image))).toBe(true);
    expect(guide.body.length > 0).toBe(true);
  });
});
