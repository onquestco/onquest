import type { ReactNode } from 'react';
import { PinIcon } from '@/design-system/components/icons';
import type { BlogData } from '@/lib/blog/schema';
import { BlogBody } from './BlogBody';
import { BlogGallery } from './BlogGallery';

// The part of a blog every view shares (spec §6.2): title, place, gallery, text. The blog page,
// the owner view and the composer's Preview all render it, so Preview is exactly what readers get.
// Missing parts aren't drawn: a text-only blog has no gallery, a blog without a place no chip.

type Props = Pick<BlogData, 'title' | 'blocks' | 'photos' | 'placeName'> & {
  /** The writer row, above the title. */
  writer?: ReactNode;
  /** Straight after the text (the blog page's read-end marker). */
  afterBody?: ReactNode;
  /** Opens a gallery photo full screen. */
  onOpenPhoto?: (index: number) => void;
};

export function BlogArticle({ title, blocks, photos, placeName, writer, afterBody, onOpenPhoto }: Props) {
  return (
    <article className="flex flex-col gap-4">
      {writer}
      {title && <h1 className="text-title break-words text-ink">{title}</h1>}
      {placeName && (
        <p className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-pill bg-brand-wash px-3.5 text-label text-ink">
          <PinIcon size={14} />
          {placeName}
        </p>
      )}
      <BlogGallery photos={photos} title={title} onOpen={onOpenPhoto} />
      <BlogBody blocks={blocks} />
      {afterBody}
    </article>
  );
}
