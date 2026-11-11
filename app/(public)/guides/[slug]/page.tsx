import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuideQuests } from '@/features/guides/getGuideQuests';
import { getGuide, publishedGuides } from '@/features/guides/guides';
import { GuideView } from '@/features/guides/GuideView';
import { absoluteUrl, SITE_NAME } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

// Built at deploy time: a new guide is a new deployment.
export const dynamicParams = false;
export const generateStaticParams = () => publishedGuides().map((guide) => ({ slug: guide.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  const url = absoluteUrl(`/guides/${guide.slug}`);
  return {
    title: `${guide.title} | ${SITE_NAME}`,
    description: guide.summary,
    alternates: { canonical: url },
    robots: guide.draft ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      title: guide.title,
      url,
      images: [absoluteUrl(guide.image)],
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  return <GuideView guide={guide} quests={await getGuideQuests(guide.questKeys)} />;
}
