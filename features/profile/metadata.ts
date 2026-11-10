import type { Metadata } from 'next';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import type { ProfileView } from './getProfile';

/** /@handle: indexed only with at least one public Quest (spec C §4.4). */
export function profileMetadata(profile: ProfileView): Metadata {
  const url = absoluteUrl(`/@${profile.handle}`);
  const description =
    profile.bio ??
    `${profile.stats.quests} ${profile.stats.quests === 1 ? 'Quest' : 'Quests'} on ${SITE_NAME}${
      profile.places.length > 0 ? `: ${profile.places.slice(0, 5).join(', ')}` : ''
    }`;
  return {
    title: `${profile.name} (@${profile.handle}) | ${SITE_NAME}`,
    description: description.slice(0, 155),
    alternates: { canonical: url },
    robots: profile.stats.quests > 0 ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { type: 'profile', siteName: SITE_NAME, title: profile.name, url, description },
  };
}
