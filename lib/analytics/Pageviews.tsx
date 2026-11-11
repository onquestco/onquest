'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { trackPageview } from './client';

/** One $pageview per route change, with the route pattern only. Renders nothing. */
export function Pageviews() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);
  return null;
}
