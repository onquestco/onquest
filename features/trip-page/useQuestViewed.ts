'use client';

import { useEffect, useRef, useState } from 'react';
import { blogReferrer, type BlogReferrer } from '@/features/blogs/blogReferrer';
import { track } from '@/lib/analytics/client';
import { takeSrc } from '@/lib/analytics/src';
import type { ViewerState } from '@/lib/social/schema';
import { questSourceFor, questViewedProperties, type QuestViewFacts } from './questProperties';

type Arrival = { source: number | undefined; referrer: BlogReferrer; loadTimeMs: number };

// The first Quest view in a document can be the page the browser opened; any later one came
// through the app. Module state on purpose: it lives exactly as long as the document.
let landingTaken = false;

/** The browser loaded this document at this Quest's address (not reached by a link in the app). */
function isLanding(): boolean {
  if (landingTaken) return false;
  landingTaken = true;
  const [navigation] = performance.getEntriesByType('navigation');
  if (!navigation) return false;
  try {
    return new URL(navigation.name).pathname === window.location.pathname;
  } catch {
    return false;
  }
}

/**
 * Until the cover shows. Opened directly: the first paint of the server-rendered cover. Reached in
 * the app: from this page's first render to now, which leaves out the request itself.
 */
function loadTime(landing: boolean, renderedAt: number): number {
  if (landing) {
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    return paint ? paint.startTime : performance.now();
  }
  return performance.now() - renderedAt;
}

function readArrival(renderedAt: number): Arrival {
  const landing = isLanding();
  return {
    source: questSourceFor(takeSrc(), landing),
    // In the app, document.referrer is still the first page's: only a landing has a referrer.
    referrer: landing ? blogReferrer(document.referrer, window.location.origin) : 'none',
    loadTimeMs: loadTime(landing, renderedAt),
  };
}

/** quest_viewed once per page view, as soon as we know who is looking (spec §6.2). Owners too. */
export function useQuestViewed(
  questKey: string,
  ownerKey: string | undefined,
  viewer: ViewerState | null,
  facts: QuestViewFacts | undefined,
) {
  const [renderedAt] = useState(() => (typeof performance === 'undefined' ? 0 : performance.now()));
  const arrival = useRef<Arrival | null>(null);
  const sent = useRef(false);

  // On mount, before the viewer answers: the tag is read (and removed) and the time taken now.
  useEffect(() => {
    arrival.current ??= readArrival(renderedAt);
  }, [renderedAt]);

  useEffect(() => {
    if (!viewer || !facts || !ownerKey || sent.current) return;
    sent.current = true;
    arrival.current ??= readArrival(renderedAt);
    track('quest_viewed', questViewedProperties({ questKey, ownerKey, viewer, facts, ...arrival.current }));
  }, [questKey, ownerKey, viewer, facts, renderedAt]);
}
