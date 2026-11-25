import { serializeJsonLd } from '@/features/trip-page/jsonLd';
import type { BlogData } from '@/lib/blog/schema';
import type { QuestSocial } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';
import { BlogPageArticle } from './BlogPageArticle';
import { BlogSocial } from './BlogSocial';
import { BlogTopBar } from './BlogTopBar';
import { BlogUpdatedToast } from './BlogUpdatedToast';
import { blogJsonLd } from './jsonLd';
import { LinkedQuestCard } from './LinkedQuestCard';
import { LiveBlogSocialProvider } from './LiveBlogSocialProvider';
import { WriteYourOwnCard } from './WriteYourOwnCard';

type Props = {
  blog: BlogData;
  /** get_blog_social: likes, comments, and whether comments are on (never BlogData.commentsOn). */
  social: QuestSocial;
  ownerKey: string;
  /** get_blog_quest: the card readers may see, or null (spec D12). */
  linkedQuest: QuestCard | null;
  /**
   * `reader`: the public page, cached and the same for everyone. `owner`: /blogs/[key], the
   * writer's own view of any visibility, never cached and without reader analytics.
   */
  mode: 'reader' | 'owner';
  /** Just posted an edit: "Blog updated." */
  updated?: boolean;
};

/**
 * The blog page (PRD B5): top bar, writer row, title, place, gallery, text, "From this trip",
 * likes and comments, then "Write your own". Server-rendered; the parts that depend on who is
 * reading fill in once /api/blogs/{key}/me answers.
 */
export function BlogView({ blog, social, ownerKey, linkedQuest, mode, updated = false }: Props) {
  return (
    <LiveBlogSocialProvider
      blogKey={blog.key}
      path={blog.path}
      ownerKey={ownerKey}
      initial={social}
      readerQuest={linkedQuest}
      trackReading={mode === 'reader'}
    >
      <BlogTopBar title={blog.title} path={blog.path} />
      <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 bg-surface px-4 pt-4 pb-10">
        <BlogPageArticle
          title={blog.title}
          blocks={blog.blocks}
          photos={blog.photos}
          placeName={blog.placeName}
          writer={blog.writer}
          publishedAt={blog.publishedAt}
          readMinutes={blog.readMinutes}
        />
        <LinkedQuestCard readerQuest={linkedQuest} />
        <BlogSocial />
        <WriteYourOwnCard />
      </main>
      {mode === 'reader' && (
        <script
          type="application/ld+json"
          // Built by us from the blog's fields and serialized with "<" escaped, so no user text can
          // close the tag (CLAUDE.md security rules).
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogJsonLd(blog)) }}
        />
      )}
      <BlogUpdatedToast show={updated} />
    </LiveBlogSocialProvider>
  );
}
