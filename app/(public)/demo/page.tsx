import type { Metadata } from 'next';
import { QuestUnavailable } from '@/features/trip-page/QuestUnavailable';
import { tripMetadata } from '@/features/trip-page/metadata';
import { TripView } from '@/features/trip-page/TripView';
import { goaTrip } from '@/lib/demo/goaTrip';
import { sampleQuests, type SampleQuestName } from '@/lib/demo/sampleQuests';
import {
  sampleSocial,
  sampleViewers,
  type SampleSocialName,
  type SampleViewerName,
} from '@/lib/demo/sampleSocial';
import { isTemplateId } from '@/templates/registry';

export const metadata: Metadata = tripMetadata(goaTrip);

type Props = {
  searchParams: Promise<{
    quest?: string;
    template?: string;
    social?: string;
    viewer?: string;
    state?: string;
    comment?: string;
  }>;
};

const pick = <Name extends string>(options: Record<Name, unknown>, value: string | undefined, fallback: Name) =>
  value && value in options ? (value as Name) : fallback;

// /demo plays the Goa sample with sample likes and comments. Every Quest page state is one URL away:
//   ?quest=small|full|old             the edge-case trips
//   ?template=mountain                the same trip in another template
//   ?social=none|few|many|off         likes and comments (off = comments turned off)
//   ?viewer=signedOut|friend|owner    who is looking
//   ?comment=open                     back from sign-in with the comment box open
//   ?state=private|removed            the unavailable link pages
export default async function DemoPage({ searchParams }: Props) {
  const params = await searchParams;
  if (params.state === 'private' || params.state === 'removed') return <QuestUnavailable reason={params.state} />;

  const sample = params.quest && params.quest in sampleQuests ? sampleQuests[params.quest as SampleQuestName] : goaTrip;
  const trip = params.template && isTemplateId(params.template) ? { ...sample, templateId: params.template } : sample;
  const social = sampleSocial[pick<SampleSocialName>(sampleSocial, params.social, 'many')];
  const viewer = sampleViewers[pick<SampleViewerName>(sampleViewers, params.viewer, 'friend')];
  return <TripView trip={trip} social={{ initial: social, viewer, openComposer: params.comment === 'open' }} />;
}
