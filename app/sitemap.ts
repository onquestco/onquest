import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

// Public trips and profiles are added here once they come from the database (week 2):
// list_sitemap_trips() returns only public trips with enough words to be worth indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/demo'), changeFrequency: 'monthly', priority: 0.8 },
  ];
}
