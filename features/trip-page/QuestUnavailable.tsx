import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { Logo } from '@/design-system/components/Logo';

const COPY = {
  private: 'This Quest is private.',
  removed: 'This Quest was removed.',
} as const;

type Props = {
  reason: keyof typeof COPY;
  /** The owner opening their own private Quest's link gets a way in (spec B §3.2). */
  ownerQuestKey?: string;
};

/** Private and removed links: the message and nothing else, no photos (M8, M16). */
export function QuestUnavailable({ reason, ownerQuestKey }: Props) {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 bg-surface px-4 text-center">
      <Logo />
      <h1 className="text-title text-ink">{COPY[reason]}</h1>
      <div className="flex w-full flex-col gap-2">
        {ownerQuestKey ? (
          <Link href={`/quests/${ownerQuestKey}/view`} className={buttonClassName({ block: true })}>
            Open your Quest
          </Link>
        ) : (
          <Link href="/quests/new" className={buttonClassName({ block: true })}>
            Make your own Quest
          </Link>
        )}
        <Link href="/" className={buttonClassName({ variant: 'quiet', block: true })}>
          Go to OnQuest
        </Link>
      </div>
    </main>
  );
}
