'use client';

import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import type { Person } from '@/lib/social/schema';
import { FollowButton } from './FollowButton';

type Props = { kind: 'followers' | 'following'; people: Person[]; me: string };

const EMPTY = { followers: 'No followers yet.', following: 'Not following anyone yet.' };

/** Screen 18 (M27): each person with Follow / Following; tapping Following unfollows. */
export function FollowList({ kind, people, me }: Props) {
  if (people.length === 0) return <p className="text-body text-ink-muted">{EMPTY[kind]}</p>;
  return (
    <ul className="flex flex-col">
      {people.map((person) => (
        <li key={person.key} className="flex items-center gap-3 border-b border-line py-3">
          <Link href={`/@${person.handle}`} className="flex min-h-11 flex-1 items-center gap-3">
            <Avatar name={person.name} src={person.avatarUrl} size={40} />
            <span className="flex flex-col">
              <span className="text-body font-semibold text-ink">{person.name}</span>
              <span className="text-label font-normal text-ink-muted">@{person.handle}</span>
            </span>
          </Link>
          {person.key !== me && (
            <FollowButton
              targetKey={person.key}
              following={person.following ?? false}
              signedIn
              returnPath={`/@${person.handle}`}
              source="followers_list"
            />
          )}
        </li>
      ))}
    </ul>
  );
}
