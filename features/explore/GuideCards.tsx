import Link from 'next/link';
import type { GuideCard } from '@/lib/social/schema';

/** Guide cards on Explore and in search ("Stories"). */
export function GuideCards({ guides }: { guides: GuideCard[] }) {
  return (
    <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {guides.map((guide) => (
        <li key={guide.slug} className="w-56 shrink-0">
          <Link href={`/guides/${guide.slug}`} className="flex flex-col gap-2">
            <img
              src={guide.image}
              alt={guide.imageAlt}
              className="aspect-3/2 w-full rounded-md object-cover"
            />
            <span className="text-label font-semibold text-ink">{guide.title}</span>
            <span className="text-caption text-ink-muted">{guide.minutes} min read</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
