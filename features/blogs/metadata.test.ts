import { describe, expect, it } from 'vitest';
import { blogPlainText } from '@/lib/blog/markdown';
import { blogFixture, bodyOfWords } from './blogFixture';
import { blogMetadata, unavailableBlogMetadata } from './metadata';

// Index rules, description and canonical for blog pages (spec §3.7).

describe('blogMetadata', () => {
  it('indexes a public blog of 80 words or more', () => {
    const blog = blogFixture({ body: bodyOfWords(80), wordCount: 85 });
    expect(blogMetadata(blog).robots).toEqual({ index: true, follow: true });
  });

  it('a thin public blog (under 80 words) is noindex but followed', () => {
    const blog = blogFixture({ wordCount: 79 });
    expect(blogMetadata(blog).robots).toEqual({ index: false, follow: true });
  });

  it('an unlisted blog is never indexed or followed, however long', () => {
    const blog = blogFixture({ unlisted: true, wordCount: 2000 });
    expect(blogMetadata(blog).robots).toEqual({ index: false, follow: false });
  });

  it('the canonical URL is the /@handle/blog/slug address', () => {
    expect(blogMetadata(blogFixture()).alternates?.canonical).toBe('https://onquest.in/@riya/blog/goa-on-15k');
  });

  it('the title says who wrote it and stays near 60 characters', () => {
    expect(blogMetadata(blogFixture()).title).toBe('Goa on 15k: what worked by Riya | OnQuest');
    const long = blogMetadata(blogFixture({ title: 'A very long title about a very long trip around the whole of Kerala' }));
    expect(String(long.title)).toMatch(/… \| OnQuest$/);
    expect(String(long.title).replace(' | OnQuest', '').length).toBeLessThanOrEqual(60);
  });

  it('describes it with the first 155 characters of the text, whitespace collapsed', () => {
    const body = `First   line\nsecond line\n\n${'x'.repeat(300)}`;
    const description = String(blogMetadata(blogFixture({ body })).description);
    expect(description.startsWith('First line second line x')).toBe(true);
    expect([...description]).toHaveLength(155);
    expect(description.endsWith('…')).toBe(true);
  });

  it('describes a formatted blog in plain text, with spoilers hidden', () => {
    const body = '# Day 1\n- **Beach** and *fort*\n\n> The ending: >!he was the guide!< [map](https://goa.example.in)';
    expect(blogMetadata(blogFixture({ body })).description).toBe('Day 1 Beach and fort The ending: (spoiler) map');
  });

  it("describes the whole body, so an unclosed >! is text the page shows, not a cut spoiler", () => {
    const body = 'Rated 10/10 >!wow and the rest of the day';
    expect(blogMetadata(blogFixture({ body })).description).toBe(body);
  });

  it('describes a body as blogPlainText reads the whole of it', () => {
    const body = '### Tips\n1. `npm` and ~~cash~~ **only**\n\n> [Map](https://goa.example.in) >!a!< b';
    expect(blogMetadata(blogFixture({ body })).description).toBe(blogPlainText(body));
  });

  it('describes the plain fixture blog exactly as before formatting existed', () => {
    expect(blogMetadata(blogFixture()).description).toBe('We stayed in Anjuna. Scooters were ₹400 a day.');
  });

  it('without text, says who wrote it and where', () => {
    expect(blogMetadata(blogFixture({ body: '' })).description).toBe('A blog by @riya · Goa');
    expect(blogMetadata(blogFixture({ body: '', placeName: undefined })).description).toBe('A blog by @riya');
  });

  it('is an article with its dates and author for link previews', () => {
    const { openGraph, twitter } = blogMetadata(blogFixture());
    expect(openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2026-11-20T10:00:00.000Z',
      modifiedTime: '2026-11-21T10:00:00.000Z',
      authors: ['https://onquest.in/@riya'],
    });
    expect(twitter).toMatchObject({ card: 'summary_large_image' });
  });
});

describe('unavailableBlogMetadata', () => {
  it('private and removed links are never indexed', () => {
    expect(unavailableBlogMetadata('private')).toEqual({
      title: 'This blog is private | OnQuest',
      robots: { index: false, follow: false },
    });
    expect(unavailableBlogMetadata('removed').robots).toEqual({ index: false, follow: false });
  });
});
