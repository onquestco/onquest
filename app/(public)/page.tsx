import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { Logo } from '@/design-system/components/Logo';
import { DeletedNotice } from '@/features/account/DeletedNotice';
import { SiteFooter } from '@/features/shell/SiteFooter';

// Placeholder landing page until the real one: the way in (sign in), and a sample to look at.
export default function HomePage() {
  return (
    <>
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
        <h1>
          <Logo height={48} />
        </h1>
        <p className="text-lead text-ink-muted">
          A home on the web for all your trips. Turn your photos into a scrapbook page you can share.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link href="/login" className={buttonClassName({ block: true })}>
            Get started
          </Link>
          <Link href="/demo" className={buttonClassName({ variant: 'secondary', block: true })}>
            See a sample trip
          </Link>
        </div>
        <DeletedNotice />
      </main>
      <SiteFooter />
    </>
  );
}
