import { PinIcon } from '@/design-system/components/icons';
import { SiteFooter } from '@/features/shell/SiteFooter';
import type { ProfileView as Profile } from './getProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileQuestGrid } from './ProfileQuestGrid';
import { OwnProfileNote, ProfileTopBar, ProfileViewerProvider } from './ProfileViewerContext';

/** Screen 15: who they are, their numbers, places, and their public Quests (M15, M22). */
export function ProfileView({ profile }: { profile: Profile }) {
  return (
    <ProfileViewerProvider profileKey={profile.key}>
      <ProfileTopBar handle={profile.handle} />
      <ProfileHeader profile={profile} />
      <main className="mx-auto flex max-w-lg md:max-w-3xl flex-col gap-3 px-4 pt-3 pb-28">
        {profile.places.length > 0 && (
          <ul aria-label="Places" className="flex flex-wrap gap-1.5">
            {profile.places.map((place) => (
              <li
                key={place}
                className="flex min-h-9 items-center gap-1 rounded-pill bg-brand-wash px-3.5 text-label text-ink"
              >
                <span className="text-brand-strong">
                  <PinIcon />
                </span>
                {place}
              </li>
            ))}
          </ul>
        )}

        <section aria-label="Quests" className="flex flex-col gap-3 pt-1">
          <h2 className="text-lead font-semibold text-ink">Quests</h2>
          {profile.quests.length === 0 ? (
            <p className="text-body text-ink-muted">No public Quests yet.</p>
          ) : (
            <ProfileQuestGrid initial={profile.quests} />
          )}
          <OwnProfileNote />
        </section>
        <SiteFooter />
      </main>
    </ProfileViewerProvider>
  );
}
