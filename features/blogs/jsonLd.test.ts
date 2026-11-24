import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from '@/features/trip-page/jsonLd';
import { blogFixture } from './blogFixture';
import { blogJsonLd } from './jsonLd';

describe('blogJsonLd', () => {
  const data = blogJsonLd(blogFixture());
  const [posting, breadcrumb] = data['@graph'];

  it('describes the blog as a BlogPosting by its writer', () => {
    expect(posting).toMatchObject({
      '@type': 'BlogPosting',
      headline: 'Goa on 15k: what worked',
      url: 'https://onquest.in/@riya/blog/goa-on-15k',
      datePublished: '2026-11-20T10:00:00.000Z',
      dateModified: '2026-11-21T10:00:00.000Z',
      author: { '@type': 'Person', name: 'Riya', url: 'https://onquest.in/@riya' },
      image: 'https://photos.example/1/display.webp',
      contentLocation: { '@type': 'Place', name: 'Goa' },
    });
    expect(posting).toHaveProperty('wordCount');
  });

  it('has a Home → @handle → title breadcrumb', () => {
    expect(breadcrumb).toMatchObject({ '@type': 'BreadcrumbList' });
    const names = (breadcrumb as { itemListElement: { name: string }[] }).itemListElement.map((item) => item.name);
    expect(names).toEqual(['OnQuest', '@riya', 'Goa on 15k: what worked']);
  });

  it('leaves out the image and place a blog does not have', () => {
    const [bare] = blogJsonLd(blogFixture({ photos: [], placeName: undefined }))['@graph'];
    expect(bare).not.toHaveProperty('image');
    expect(bare).not.toHaveProperty('contentLocation');
  });

  it('a title with a closing script tag cannot break out of the JSON-LD tag', () => {
    const title = '</script><script>alert(1)</script>';
    const json = serializeJsonLd(blogJsonLd(blogFixture({ title })));
    expect(json).not.toContain('<');
    expect(JSON.parse(json)['@graph'][0].headline).toBe(title);
  });
});
