import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { BlogUnavailable } from '@/features/blogs/BlogUnavailable';
import { BlogView } from '@/features/blogs/BlogView';
import { getBlog } from '@/features/blogs/getBlog';
import { getBlogSocial } from '@/features/blogs/getBlogSocial';
import { getBlogStatus } from '@/features/blogs/getBlogStatus';
import { getLinkedQuest } from '@/features/blogs/getLinkedQuest';
import { blogMetadata, unavailableBlogMetadata } from '@/features/blogs/metadata';
import { SiteFooter } from '@/features/shell/SiteFooter';
import { getMovedHandle } from '@/features/trip-page/getMovedHandle';

// /@handle/blog/slug, rewritten here in next.config.ts (spec §3.3). The address is always /@…

type Props = { params: Promise<{ handle: string; slug: string }> };

// Nothing is built ahead of time, but each page's HTML is cached after its first visit.
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const result = await getBlog(handle, slug);
  if (result) return blogMetadata(result.blog);
  const status = await getBlogStatus(handle, slug);
  return status ? unavailableBlogMetadata(status) : {};
}

export default async function BlogPage({ params }: Props) {
  const { handle, slug } = await params;
  const result = await getBlog(handle, slug);
  if (!result) {
    const status = await getBlogStatus(handle, slug);
    if (!status) {
      // An old handle: the same blog under the person's current one (308).
      const moved = await getMovedHandle(handle);
      if (moved) permanentRedirect(`/@${moved}/blog/${slug.toLowerCase()}`);
      notFound();
    }
    return <BlogUnavailable reason={status} url={{ handle: handle.toLowerCase(), slug: slug.toLowerCase() }} />;
  }

  const { blog, ownerKey } = result;
  const [social, linkedQuest] = await Promise.all([getBlogSocial(blog.key), getLinkedQuest(blog.key, ownerKey)]);
  return (
    <>
      {/* social is null only if the blog went private between the two reads: no likes or comments. */}
      <BlogView
        blog={blog}
        social={social ?? EMPTY_SOCIAL}
        ownerKey={ownerKey}
        linkedQuest={linkedQuest}
        mode="reader"
      />
      <SiteFooter reportUrl={blog.url} />
    </>
  );
}

const EMPTY_SOCIAL = { likeCount: 0, commentCount: 0, commentsOn: false, comments: [] };
