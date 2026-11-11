'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics/client';

const SOURCES = ['sign_in', 'settings', 'footer'] as const;

/** legal_page_viewed, with where the person came from (?from=… on our own links, else direct). */
export function LegalViewed({ page }: { page: 'privacy' | 'terms' }) {
  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get('from');
    const source = SOURCES.find((known) => known === from) ?? 'direct';
    track('legal_page_viewed', { page, source });
  }, [page]);
  return null;
}
