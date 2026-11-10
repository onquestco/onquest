import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';

/** Shown when a create-flow screen opens without its draft (e.g. after a reload, until A-04 loads drafts). */
export function LostDraft() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-body text-ink">This Quest isn&apos;t on this device any more. Start again from your photos.</p>
      <Link href="/quests/new" className={buttonClassName()}>
        Pick photos
      </Link>
    </main>
  );
}
