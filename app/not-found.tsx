import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { Logo } from '@/design-system/components/Logo';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Page not found | ${SITE_NAME}`,
  robots: { index: false },
};

/** Any unknown URL, including a mistyped @handle: our look instead of Next's black default. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 bg-surface px-4 text-center">
      <Logo />
      <h1 className="text-title text-ink">We couldn&apos;t find that page.</h1>
      <p className="text-body text-ink-muted">The link may be mistyped, or the page has moved.</p>
      <Link href="/" className={buttonClassName()}>
        Go to OnQuest
      </Link>
    </main>
  );
}
