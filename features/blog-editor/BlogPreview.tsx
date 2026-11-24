import { Avatar } from '@/design-system/components/Avatar';
import { QuestCardView, questCardMeta } from '@/design-system/components/QuestCardView';
import { BlogArticle } from '@/features/blogs/BlogArticle';
import { readMinutes, toParagraphs } from '@/lib/blog/toBlogData';
import type { BlogData, BlogDocument } from '@/lib/blog/schema';
import { photoUrls } from '@/lib/storage';
import type { QuestCard } from '@/lib/trip/cards';

// Preview (PRD B6): the blog as readers will see it, from what's on this device right now, with
// this device's photo previews, so it works before uploads finish and offline.

export type Writer = { handle: string; name: string };

/** Words as publish_blog counts them: the title and the text, split on whitespace. */
export function countWords(title: string, body: string): number {
  return `${title} ${body}`.split(/\s+/).filter(Boolean).length;
}

export function previewArticle(
  document: BlogDocument,
  photoFolder: string,
  previews: Record<string, string>,
): Pick<BlogData, 'title' | 'paragraphs' | 'photos' | 'placeName'> {
  const title = (document.title ?? '').trim();
  return {
    title,
    paragraphs: toParagraphs(document.body),
    photos: document.photos.map((photo) => {
      const stored = photoUrls(photoFolder, photo.id);
      const local = previews[photo.id];
      return { ...photo, display: local ?? stored.display, thumb: local ?? stored.thumb };
    }),
    ...(document.place ? { placeName: document.place.name } : {}),
  };
}

type Props = {
  document: BlogDocument;
  photoFolder: string;
  previews: Record<string, string>;
  writer: Writer;
  linkedQuest?: QuestCard;
};

export function BlogPreview({ document, photoFolder, previews, writer, linkedQuest }: Props) {
  const article = previewArticle(document, photoFolder, previews);
  const minutes = readMinutes(countWords(article.title, document.body));
  return (
    <BlogArticle
      {...article}
      writer={
        <div className="flex items-center gap-3">
          <Avatar name={writer.name} size={40} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-label font-semibold text-ink">{writer.name}</span>
            <span className="truncate text-caption text-ink-muted">
              @{writer.handle} · {minutes} min read
            </span>
          </span>
        </div>
      }
      afterBody={
        linkedQuest?.path && (
          <section aria-label="From this trip" className="flex flex-col gap-2 pt-4">
            <h2 className="text-lead font-semibold text-ink">From this trip</h2>
            <QuestCardView
              href={linkedQuest.path}
              title={linkedQuest.title}
              coverUrl={linkedQuest.coverThumb}
              places={linkedQuest.places}
              meta={questCardMeta(linkedQuest.pageCount, linkedQuest.photoCount)}
            />
          </section>
        )
      }
    />
  );
}
