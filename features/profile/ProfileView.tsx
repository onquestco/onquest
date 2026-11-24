import { PinIcon } from '@/design-system/components/icons';
import { SiteFooter } from '@/features/shell/SiteFooter';
import type { ProfileView as Profile } from './getProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileSections } from './ProfileSections';
import { ProfileTopBar, ProfileViewerProvider } from './ProfileViewerContext';

/** Screen 15: who they are, their numbers, places, and their public Quests and blogs (M15, M22, B12). */
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

        <ProfileSections quests={profile.quests} blogs={profile.blogs} />
        <SiteFooter />
      </main>
    </ProfileViewerProvider>
  );
}
