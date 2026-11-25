import { Avatar } from '@/design-system/components/Avatar';
import { questCardMeta } from '@/design-system/components/QuestCardView';
import { BlogArticle } from '@/features/blogs/BlogArticle';
import { parseBlogBody } from '@/lib/blog/markdown';
import { readMinutes } from '@/lib/blog/toBlogData';
import type { BlogData, BlogDocument } from '@/lib/blog/schema';
import { photoUrls } from '@/lib/storage';
import type { QuestCard } from '@/lib/trip/cards';
import type { Visibility } from '@/lib/trip/schema';

// Preview (PRD B6): the blog as readers will see it, from what's on this device right now, with
// this device's photo previews, so it works before uploads finish and offline.

export type Writer = { handle: string; name: string };

export const HIDDEN_QUEST_NOTE = "Your linked Quest isn't visible to readers";

/**
 * Whether readers of a blog see its linked Quest's card (spec D12, PRD change 4): a public Quest
 * always, an unlisted one only on a blog that isn't public, a private one never. The blog never
 * makes a Quest easier to find.
 */
export function readersSeeLinkedQuest(quest: Visibility, blog: Visibility): boolean {
  if (quest === 'public') return true;
  if (quest === 'unlisted') return blog !== 'public';
  return false;
}

/** Words as publish_blog counts them: the title and the text, split on whitespace. */
export function countWords(title: string, body: string): number {
  return `${title} ${body}`.split(/\s+/).filter(Boolean).length;
}

export function previewArticle(
  document: BlogDocument,
  photoFolder: string,
  previews: Record<string, string>,
): Pick<BlogData, 'title' | 'blocks' | 'photos' | 'placeName'> {
  const title = (document.title ?? '').trim();
  return {
    title,
    // The same parser as the blog page (toBlogData), so Preview is exactly what readers get.
    blocks: parseBlogBody(document.body),
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
  /** Who will see the blog: its current visibility, or the Post sheet's starting choice. */
  blogVisibility: Visibility;
};

export function BlogPreview({ document, photoFolder, previews, writer, linkedQuest, blogVisibility }: Props) {
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
      afterBody={linkedQuest && <LinkedQuestPreview quest={linkedQuest} blogVisibility={blogVisibility} />}
    />
  );
}

/**
 * "From this trip" as readers will get it. Not a link: tapping it in Preview mustn't leave the
 * composer. When readers won't see the card, only the writer's note shows, as on the blog page.
 */
function LinkedQuestPreview({ quest, blogVisibility }: { quest: QuestCard; blogVisibility: Visibility }) {
  if (!readersSeeLinkedQuest(quest.visibility, blogVisibility)) {
    return (
      <p role="note" className="rounded-md bg-brand-wash px-3 py-2 text-label font-normal text-ink">
        {HIDDEN_QUEST_NOTE}
      </p>
    );
  }
  return (
    <section aria-label="From this trip" className="flex flex-col gap-2 pt-4">
      <h2 className="text-lead font-semibold text-ink">From this trip</h2>
      <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
        {quest.coverThumb && <img src={quest.coverThumb} alt="" className="aspect-4/3 w-full bg-surface-page object-cover" />}
        <div className="flex flex-col gap-0.5 px-3 py-3">
          <span className="text-lead font-semibold text-ink">{quest.title}</span>
          <span className="text-caption text-ink-muted">{questCardMeta(quest.pageCount, quest.photoCount)}</span>
          <span className="pt-1 text-label font-semibold text-brand-strong">View Quest</span>
        </div>
      </div>
    </section>
  );
}
