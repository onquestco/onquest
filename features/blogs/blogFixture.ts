import type { BlogData } from '@/lib/blog/schema';
import { toParagraphs } from '@/lib/blog/toBlogData';

// A posted blog for the blog page's unit tests.

export function blogFixture(overrides: Partial<BlogData> & { body?: string } = {}): BlogData {
  const { body = 'We stayed in Anjuna.\n\nScooters were ₹400 a day.', ...rest } = overrides;
  return {
    key: '00000000-0000-4000-8000-000000000020',
    url: 'https://onquest.in/@riya/blog/goa-on-15k',
    path: '/@riya/blog/goa-on-15k',
    unlisted: false,
    title: 'Goa on 15k: what worked',
    paragraphs: toParagraphs(body),
    photos: [
      {
        id: '00000000-0000-4000-8000-000000000031',
        width: 1600,
        height: 1200,
        display: 'https://photos.example/1/display.webp',
        thumb: 'https://photos.example/1/thumb.webp',
      },
    ],
    placeName: 'Goa',
    commentsOn: true,
    readMinutes: 1,
    wordCount: `Goa on 15k: what worked ${body}`.split(/\s+/).filter(Boolean).length,
    publishedAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-21T10:00:00.000Z',
    writer: {
      key: '00000000-0000-4000-8000-000000000001',
      handle: 'riya',
      name: 'Riya',
      profileUrl: 'https://onquest.in/@riya',
    },
    ...rest,
  };
}

/** A body of `count` words. */
export const bodyOfWords = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(' ');
