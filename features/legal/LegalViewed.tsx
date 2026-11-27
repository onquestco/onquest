'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics/client';
import { LEGAL_PAGE_CODE, LEGAL_SOURCE_CODE } from '@/lib/analytics/codes';

const SOURCES = ['sign_in', 'settings', 'footer'] as const;

/** legal_page_viewed's codes: where the person came from (?from=… on our own links, else direct). */
export function legalViewedProperties(page: 'privacy' | 'terms', from: string | null) {
  const source = SOURCES.find((known) => known === from) ?? 'direct';
  return { page: LEGAL_PAGE_CODE[page], source: LEGAL_SOURCE_CODE[source] };
}

/** legal_page_viewed, once per page. */
export function LegalViewed({ page }: { page: 'privacy' | 'terms' }) {
  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get('from');
    track('legal_page_viewed', legalViewedProperties(page, from));
  }, [page]);
  return null;
}
