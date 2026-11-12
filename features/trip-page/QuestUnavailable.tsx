import { Logo } from '@/design-system/components/Logo';
import { UnavailableActions } from './UnavailableActions';

const COPY = {
  private: 'This Quest is private.',
  removed: 'This Quest was removed.',
} as const;

type Props = {
  reason: keyof typeof COPY;
  /** The link's handle and slug: on a private link the owner gets "Open your Quest" (spec B §3.2). */
  url?: { handle: string; slug: string };
};

/** Private and removed links: the message and nothing else, no photos (M8, M16). */
export function QuestUnavailable({ reason, url }: Props) {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 bg-surface px-4 text-center">
      <Logo />
      <h1 className="text-title text-ink">{COPY[reason]}</h1>
      <UnavailableActions checkOwner={reason === 'private' ? url : undefined} />
    </main>
  );
}

export const UNAVAILABLE_TITLES = COPY;
