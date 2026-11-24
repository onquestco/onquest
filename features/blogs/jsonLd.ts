import type { BlogData } from '@/lib/blog/schema';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const isAbsoluteHttpUrl = (url: string) => /^https?:\/\//.test(url);

/**
 * schema.org for a blog page (spec §3.7, docs/03 §C.3): a BlogPosting and its breadcrumb
 * (Home → @handle → title). Serialize it with serializeJsonLd(), which escapes "<".
 */
export function blogJsonLd(blog: BlogData) {
  const cover = blog.photos[0]?.display;
  const posting = {
    '@type': 'BlogPosting',
    headline: blog.title,
    url: blog.url,
    mainEntityOfPage: blog.url,
    datePublished: blog.publishedAt,
    dateModified: blog.updatedAt,
    author: { '@type': 'Person', name: blog.writer.name, url: blog.writer.profileUrl },
    ...(cover && isAbsoluteHttpUrl(cover) ? { image: cover } : {}),
    ...(blog.placeName ? { contentLocation: { '@type': 'Place', name: blog.placeName } } : {}),
    wordCount: blog.wordCount,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: `@${blog.writer.handle}`, item: blog.writer.profileUrl },
      { '@type': 'ListItem', position: 3, name: blog.title, item: blog.url },
    ],
  };
  return { '@context': 'https://schema.org', '@graph': [posting, breadcrumb] };
}
