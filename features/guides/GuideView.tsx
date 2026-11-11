import { QuestCardView } from '@/design-system/components/QuestCardView';
import { serializeJsonLd } from '@/features/trip-page/jsonLd';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import type { QuestCard } from '@/lib/trip/cards';
import type { Guide } from './guideSchema';
import { renderGuide } from './renderGuide';
import { SiteFooter } from '@/features/shell/SiteFooter';

/** Screen 14: the image, "Guide · 4 min read · by the OnQuest team", the text, its Quests. */
export function GuideView({ guide, quests }: { guide: Guide; quests: QuestCard[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.summary,
    image: absoluteUrl(guide.image),
    datePublished: guide.publishedAt,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
  };

  return (
    <>
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-6">
        {guide.draft && (
          <p className="rounded-sm bg-brand-wash px-3 py-2 text-label text-ink">
            Draft guide: placeholder text.
          </p>
        )}
        <img src={guide.image} alt={guide.imageAlt} className="aspect-3/2 w-full rounded-lg object-cover" />
        <p className="text-label text-ink-muted">
          Guide · {guide.minutes} min read · by {guide.author}
        </p>
        <h1 className="text-title text-ink">{guide.title}</h1>
        <p className="text-lead text-ink-muted">{guide.summary}</p>
        <article className="flex flex-col gap-3">{renderGuide(guide.body)}</article>

        {quests.length > 0 && (
          <section aria-label="Quests from this guide" className="flex flex-col gap-4 pt-4">
            <h2 className="text-lead font-semibold text-ink">Quests from this guide</h2>
            {quests.map((quest) => (
              <QuestCardView
                key={quest.key}
                href={quest.path ?? '#'}
                title={quest.title}
                coverUrl={quest.coverThumb}
                places={quest.places}
                owner={{
                  name: quest.owner.name,
                  avatarUrl: quest.owner.avatarUrl,
                  href: `/@${quest.owner.handle}`,
                }}
              />
            ))}
          </section>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      </main>
      <SiteFooter />
    </>
  );
}
