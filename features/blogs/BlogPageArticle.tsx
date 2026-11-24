'use client';

import { useCallback, useRef, useState } from 'react';
import { track } from '@/lib/analytics/client';
import type { BlogData } from '@/lib/blog/schema';
import { BlogArticle } from './BlogArticle';
import { BlogPhotoViewer } from './BlogPhotoViewer';
import { useBlogPage } from './LiveBlogSocialProvider';
import { useReadEnd } from './useReadEnd';
import { WriterRow } from './WriterRow';

type Props = Pick<
  BlogData,
  'title' | 'paragraphs' | 'photos' | 'placeName' | 'writer' | 'publishedAt' | 'readMinutes'
>;

/**
 * The blog itself on its page: BL-03's BlogArticle (rendered on the server too, so the text is in
 * the HTML), with the writer row, the full-screen viewer, and the read-end marker straight after
 * the last paragraph (spec §3.8).
 */
export function BlogPageArticle({ writer, publishedAt, readMinutes, ...article }: Props) {
  const { blogKey, viewId, trackReading } = useBlogPage();
  const [openAt, setOpenAt] = useState<number | null>(null);
  const marker = useRef<HTMLDivElement>(null);
  const onReadEnd = useCallback(
    (seconds: number) => track('blog_read_end', { blog_id: blogKey, view_id: viewId, seconds }),
    [blogKey, viewId],
  );
  useReadEnd(marker, onReadEnd, trackReading);

  return (
    <>
      <BlogArticle
        {...article}
        writer={<WriterRow writer={writer} publishedAt={publishedAt} readMinutes={readMinutes} />}
        onOpenPhoto={setOpenAt}
        afterBody={<div ref={marker} data-read-end aria-hidden />}
      />
      {article.photos.length > 0 && (
        <BlogPhotoViewer
          photos={article.photos}
          title={article.title}
          openAt={openAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}
