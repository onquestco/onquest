import Link from 'next/link';
import type { GuideCard } from '@/lib/social/schema';

/** Guides on Explore and in search, as the prototype's rows: picture, "Guide · 4 min read", title. */
export function GuideCards({ guides }: { guides: GuideCard[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {guides.map((guide) => (
        <li key={guide.slug}>
          <Link
            href={`/guides/${guide.slug}`}
            className="flex items-center gap-3 rounded-md border border-line bg-surface p-2"
          >
            <img src={guide.image} alt="" className="size-19 shrink-0 rounded-md object-cover" />
            <span className="flex flex-col gap-0.5">
              <span className="text-caption font-semibold text-brand-strong">
                Guide · {guide.minutes} min read
              </span>
              <span className="text-body font-semibold text-ink">{guide.title}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
