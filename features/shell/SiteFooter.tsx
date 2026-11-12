import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/site';

/**
 * Privacy · Terms · support address, at the end of public pages (legal PRD, P5). On a Quest page
 * it also carries Report, which used to live in the template's own footer.
 */
export function SiteFooter({ reportUrl }: { reportUrl?: string }) {
  const link = 'inline-flex min-h-11 items-center underline';
  return (
    <footer className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-2 px-4 pb-6 text-caption text-ink-muted">
      <Link href="/privacy?from=footer" className={link}>
        Privacy
      </Link>
      <span aria-hidden>·</span>
      <Link href="/terms?from=footer" className={link}>
        Terms
      </Link>
      <span aria-hidden>·</span>
      {reportUrl && (
        <>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Report: ${reportUrl}`)}`}
            className={link}
          >
            Report
          </a>
          <span aria-hidden>·</span>
        </>
      )}
      <a href={`mailto:${SUPPORT_EMAIL}`} className={link}>
        {SUPPORT_EMAIL}
      </a>
    </footer>
  );
}
