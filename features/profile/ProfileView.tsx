import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import type { ProfileView as Profile } from './getProfile';
import { ProfileActions } from './ProfileActions';

/** Screen 15: who they are, their numbers, places, and their public Quests (M15, M22). */
export function ProfileView({ profile }: { profile: Profile }) {
  const { stats } = profile;
  const numbers = [
    { label: stats.quests === 1 ? 'Quest' : 'Quests', value: stats.quests },
    { label: 'following', value: stats.following, href: `/@${profile.handle}/following` },
    { label: stats.places === 1 ? 'place' : 'places', value: stats.places },
    { label: stats.countries === 1 ? 'country' : 'countries', value: stats.countries },
  ];

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-3">
        <Avatar name={profile.name} src={profile.avatarUrl} size={72} />
        <div>
          <h1 className="text-title text-ink">{profile.name}</h1>
          <p className="text-label font-normal text-ink-muted">
            @{profile.handle}
            {profile.homeCity && ` · ${profile.homeCity}`}
          </p>
        </div>
        {profile.bio && <p className="text-body whitespace-pre-line text-ink">{profile.bio}</p>}
        <ProfileActions profileKey={profile.key} handle={profile.handle} followers={stats.followers} />
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-ink-muted">
          {numbers.map((number) => (
            <li key={number.label}>
              {number.href ? (
                <Link href={number.href} className="text-ink">
                  <strong>{number.value}</strong> {number.label}
                </Link>
              ) : (
                <>
                  <strong className="text-ink">{number.value}</strong> {number.label}
                </>
              )}
            </li>
          ))}
        </ul>
      </header>

      {profile.places.length > 0 && (
        <section aria-label="Places" className="flex flex-col gap-2">
          <h2 className="text-lead font-semibold text-ink">Places</h2>
          <ul className="flex flex-wrap gap-2">
            {profile.places.map((place) => (
              <li key={place} className="rounded-pill bg-surface-page px-3 py-1 text-label text-ink">
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
                <Link href={quest.path ?? '#'} className="flex flex-col gap-2">
                  <span className="block aspect-4/5 overflow-hidden rounded-lg bg-surface-page">
                    {quest.coverThumb && (
                      <img src={quest.coverThumb} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="truncate text-label font-semibold text-ink">{quest.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
