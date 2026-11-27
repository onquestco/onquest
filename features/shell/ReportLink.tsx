'use client';

import { track } from '@/lib/analytics/client';
import { reportClickProperties } from '@/features/trip-page/questProperties';

/** The footer's Report link (an email to support), with report_click for a Quest's key. */
export function ReportLink({
  href,
  className,
  questKey,
}: {
  href: string;
  className: string;
  questKey?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => {
        if (questKey) track('report_click', reportClickProperties(questKey));
      }}
    >
      Report
    </a>
  );
}
