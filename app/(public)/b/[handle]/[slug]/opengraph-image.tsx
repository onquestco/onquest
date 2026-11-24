import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { UNAVAILABLE_BLOG_TITLES } from '@/features/blogs/BlogUnavailable';
import { getBlog } from '@/features/blogs/getBlog';
import { getBlogStatus } from '@/features/blogs/getBlogStatus';
import { previewCoverUrl } from '@/features/trip-page/previewCover';
import { QuestPreviewImage } from '@/features/trip-page/QuestPreviewImage';

type Props = { params: Promise<{ handle: string; slug: string }> };

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A blog on OnQuest';

export default async function Image({ params }: Props) {
  const { handle, slug } = await params;
  const result = await getBlog(handle, slug);
  if (!result) {
    // Private and removed links get a plain card: no photo, no title.
    const status = await getBlogStatus(handle, slug);
    if (!status) notFound();
    return new ImageResponse(
      <QuestPreviewImage title={UNAVAILABLE_BLOG_TITLES[status]} handle={handle.toLowerCase()} coverUrl={null} />,
      size,
    );
  }

  const { blog, photoFolder } = result;
  const cover = blog.photos[0];
  // The cover's export JPEG: the preview renderer can't read the WebP the page shows (spec D6).
  const coverUrl = cover ? await previewCoverUrl(photoFolder, cover.id) : null;
  return new ImageResponse(
    <QuestPreviewImage
      title={blog.title}
      subtitle={`${blog.readMinutes} min read`}
      handle={blog.writer.handle}
      coverUrl={coverUrl}
    />,
    size,
  );
}
