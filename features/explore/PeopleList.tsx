'use client';

import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import { FollowButton } from '@/features/profile/FollowButton';
import type { Person } from '@/lib/social/schema';

/** Travellers to follow, and People in search, each with Follow. */
export function PeopleList({ people, source }: { people: Person[]; source: 'explore' | 'search' }) {
  return (
    <ul className="flex flex-col gap-3">
      {people.map((person) => (
        <li
          key={person.key}
          className="flex items-center gap-2 rounded-md border border-line bg-surface py-2 pr-3 pl-3"
        >
          <Link href={`/@${person.handle}`} className="flex min-h-11 flex-1 items-center gap-3">
            <Avatar name={person.name} src={person.avatarUrl} size={44} />
            <span className="flex flex-col">
              <span className="text-body font-semibold text-ink">{person.name}</span>
              <span className="text-caption text-ink-muted">
                @{person.handle}
                {person.homeCity && ` · ${person.homeCity}`}
              </span>
            </span>
          </Link>
          <FollowButton
            targetKey={person.key}
            following={person.following ?? false}
            signedIn
            returnPath={`/@${person.handle}`}
            source={source}
          />
        </li>
      ))}
    </ul>
  );
}
