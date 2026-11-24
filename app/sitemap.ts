import type { MetadataRoute } from 'next';
import { publishedGuides } from '@/features/guides/guides';
import { absoluteUrl } from '@/lib/site';
import { createPublicSupabase } from '@/lib/supabase/public';

// Public Quests and blogs with enough words to be worth indexing, profiles with a public Quest or
// blog, and guides (spec C §4.4, blogs spec §3.7). Rebuilt at most hourly.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicSupabase();
  const [trips, profiles, blogs] = await Promise.all([
    supabase.rpc('list_sitemap_trips'),
    supabase.rpc('list_sitemap_profiles'),
    supabase.rpc('list_sitemap_blogs'),
  ]);
  const tripRows = (trips.data ?? []) as { handle: string; slug: string; updated_at: string }[];
  const profileRows = (profiles.data ?? []) as { handle: string; saved_at: string }[];
  const blogRows = (blogs.data ?? []) as { handle: string; slug: string; saved_at: string }[];

  return [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/demo'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.2 },
    ...publishedGuides()
      .filter((guide) => !guide.draft)
      .map((guide) => ({
        url: absoluteUrl(`/guides/${guide.slug}`),
        lastModified: guide.publishedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
    ...profileRows.map((row) => ({ url: absoluteUrl(`/@${row.handle}`), lastModified: row.saved_at })),
    ...tripRows.map((row) => ({
      url: absoluteUrl(`/@${row.handle}/${row.slug}`),
      lastModified: row.updated_at,
    })),
    ...blogRows.map((row) => ({
      url: absoluteUrl(`/@${row.handle}/blog/${row.slug}`),
      lastModified: row.saved_at,
    })),
  ];
}
