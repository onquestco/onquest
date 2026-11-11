import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/design-system/components/Logo';
import { SiteFooter } from '@/features/shell/SiteFooter';
import { SUPPORT_EMAIL } from '@/lib/site';
import { LegalViewed } from './LegalViewed';

type Props = {
  page: 'privacy' | 'terms';
  title: string;
  updated: string;
  short: ReactNode;
  children: ReactNode;
};

/** The frame both legal pages share: logo, title, date, "The short version", sections, contact. */
export function LegalPage({ page, title, updated, short, children }: Props) {
  return (
    <>
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6 text-body text-ink">
        <Link href="/" aria-label="OnQuest home" className="self-start">
          <Logo />
        </Link>
        <header className="flex flex-col gap-1">
          <h1 className="text-title">{title}</h1>
          <p className="text-label font-normal text-ink-muted">Last updated: {updated}</p>
        </header>
        <section aria-label="The short version" className="rounded-lg bg-brand-wash p-4">
          <h2 className="text-lead font-semibold">The short version</h2>
          <p className="mt-1">{short}</p>
        </section>
        {children}
        <p>
          Questions? Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </main>
      <SiteFooter />
      <LegalViewed page={page} />
    </>
  );
}

/** One section with a linkable heading (onquest.in/privacy#what-we-collect). */
export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-4 flex-col gap-2">
      <h2 id={`${id}-title`} className="text-lead font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A bulleted list in the legal pages' style. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
