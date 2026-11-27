import { describe, expect, it } from 'vitest';
import { BLOG_EXCERPT_LENGTH, blogExcerpt, blogExcerptFromBlocks } from './excerpt';
import { blogPlainText, parseBlogBody } from './markdown';

/** What the database's excerpt was, then cleaned as cards did before (blog_card_json + toBlogCards). */
const databaseExcerpt = (body: string) =>
  blogPlainText([...body.replace(/\s+/g, ' ').trim()].slice(0, BLOG_EXCERPT_LENGTH).join(''), { cut: true });

describe('blogExcerpt', () => {
  it('a heading line becomes plain text (the reported case)', () => {
    expect(blogExcerpt('Text\n## Text\nHello im alok')).toBe('Text Text Hello im alok');
    // Before: the joined lines kept the marker.
    expect(databaseExcerpt('Text\n## Text\nHello im alok')).toBe('Text ## Text Hello im alok');
  });

  it('drops heading, list and quote markers, inline markers and spoilers', () => {
    const body = '# Day 1\n- **Beach** and *fort*\n* scooter\n2. ~~old~~ `new`\n\n> a quote\nThe end: >!twist!<';
    const excerpt = blogExcerpt(body);
    expect(excerpt).toBe('Day 1 Beach and fort scooter old new a quote The end: (spoiler)');
    expect(excerpt).not.toMatch(/[#>`*~]|^- | - |\d\. /);
  });

  it('plain-text blogs read exactly as before', () => {
    const bodies = [
      'We stayed in Anjuna and rented a scooter.',
      'Day one.\nThe beach.\n\n\nDay two:   the fort, ₹2,000 and 5 - 10 km.',
      `${'Long walks on the beach and late dinners. '.repeat(8)}🏖️ end`,
      '',
    ];
    for (const body of bodies) expect(blogExcerpt(body)).toBe(databaseExcerpt(body));
  });

  it('cuts at the database length in code points, so an emoji is never cut in half', () => {
    const excerpt = blogExcerpt('🏖'.repeat(200));
    expect([...excerpt]).toHaveLength(BLOG_EXCERPT_LENGTH);
    expect(excerpt.length).toBeLessThanOrEqual(300); // BlogCardSchema's excerpt limit
  });

  it('reads parsed blocks the same as a body', () => {
    const body = 'Text\n## Text\nHello im alok';
    expect(blogExcerptFromBlocks(parseBlogBody(body))).toBe(blogExcerpt(body));
  });
});
