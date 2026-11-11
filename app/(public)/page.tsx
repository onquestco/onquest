import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { Logo } from '@/design-system/components/Logo';
import { DeletedNotice } from '@/features/account/DeletedNotice';

// Placeholder landing page. The real one (demo preview + sign-up CTA) comes with auth in week 2.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1>
        <Logo height={48} />
      </h1>
      <p className="text-lead text-ink-muted">
        A home on the web for all your trips. Turn your photos into a scrapbook page you can share.
      </p>
      <Link href="/demo" className={buttonClassName()}>
        See a sample trip
      </Link>
      <DeletedNotice />
    </main>
  );
}
