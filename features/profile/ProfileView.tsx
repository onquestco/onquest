import Link from 'next/link';
import { PinIcon } from '@/design-system/components/icons';
import type { ProfileView as Profile } from './getProfile';
import { SiteFooter } from '@/features/shell/SiteFooter';
import { ProfileHeader } from './ProfileHeader';
import { ProfileTopBar, ProfileViewerProvider } from './ProfileViewerContext';

/** Screen 15: who they are, their numbers, places, and their public Quests (M15, M22). */
export function ProfileView({ profile }: { profile: Profile }) {
  return (
    <ProfileViewerProvider profileKey={profile.key}>
      <ProfileTopBar handle={profile.handle} />
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 pt-4 pb-28">
        <ProfileHeader profile={profile} />

        {profile.places.length > 0 && (
          <section aria-label="Places" className="flex flex-col gap-2">
            <h2 className="text-lead font-semibold text-ink">Places</h2>
            <ul className="flex flex-wrap gap-2">
              {profile.places.map((place) => (
                <li
                  key={place}
                  className="flex items-center gap-1 rounded-pill bg-brand-wash px-3 py-1 text-label text-ink"
                >
                  <span className="text-brand-strong">
                    <PinIcon />
                  </span>
                  {place}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Quests" className="flex flex-col gap-2">
          <h2 className="text-lead font-semibold text-ink">Quests</h2>
          {profile.quests.length === 0 ? (
            <p className="text-body text-ink-muted">No public Quests yet.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4">
              {profile.quests.map((quest) => (
                <li key={quest.key}>
                  <Link
                    href={quest.path ?? '#'}
                    className="relative block aspect-4/5 overflow-hidden rounded-lg bg-night-band"
                  >
                    {quest.coverThumb && (
                      <img src={quest.coverThumb} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute inset-0 bg-linear-to-t from-night-band via-transparent to-transparent" />
                    <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-label font-semibold text-on-night">
                      {quest.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <SiteFooter />
      </main>
    </ProfileViewerProvider>
  );
}
