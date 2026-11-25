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
import { alpineFixtures } from '@/templates/alpine/fixtures';
import { coastalFixtures, type CoastalFixtureName } from '@/templates/coastal/fixtures';
import { roadtripFixtures } from '@/templates/roadtrip/fixtures';
import { isTemplateId } from '@/templates/registry';
import { winterFixtures } from '@/templates/winter/fixtures';

export const metadata: Metadata = tripMetadata(goaTrip);

type Props = {
  searchParams: Promise<{
    quest?: string;
    template?: string;
    size?: string;
    social?: string;
    viewer?: string;
    state?: string;
    comment?: string;
  }>;
};

const pick = <Name extends string>(
  options: Record<Name, unknown>,
  value: string | undefined,
  fallback: Name,
) => (value && value in options ? (value as Name) : fallback);

// /demo plays the Goa sample with sample likes and comments. Every Quest page state is one URL away:
//   ?quest=small|full|old             the edge-case trips
//   ?template=mountain                the same trip in another template
//   ?size=small|big|mixed|noCaptions|onePlace   the Coastal check trips (templates spec AC7);
//                                               with ?template=alpine|roadtrip|winter, the
//                                               new Mountain's, Roadtrip's or Winter's
//   ?social=none|few|many|off         likes and comments (off = comments turned off)
//   ?viewer=signedOut|friend|owner    who is looking
//   ?comment=open                     back from sign-in with the comment box open
//   ?state=private|removed            the unavailable link pages
export default async function DemoPage({ searchParams }: Props) {
  const params = await searchParams;
  if (params.state === 'private' || params.state === 'removed')
    return <QuestUnavailable reason={params.state} />;

  const checkTrips =
    params.template === 'alpine'
      ? alpineFixtures
      : params.template === 'roadtrip'
        ? roadtripFixtures
        : params.template === 'winter'
          ? winterFixtures
          : coastalFixtures;
  const sample =
    params.size && params.size in checkTrips
      ? checkTrips[params.size as CoastalFixtureName]
      : params.quest && params.quest in sampleQuests
        ? sampleQuests[params.quest as SampleQuestName]
        : goaTrip;
  const trip =
    params.template && isTemplateId(params.template) ? { ...sample, templateId: params.template } : sample;
  const social = sampleSocial[pick<SampleSocialName>(sampleSocial, params.social, 'many')];
  const viewer = sampleViewers[pick<SampleViewerName>(sampleViewers, params.viewer, 'friend')];
  return (
    <TripView
      trip={trip}
      social={{ mode: 'demo', initial: social, viewer, openComposer: params.comment === 'open' }}
    />
  );
}
