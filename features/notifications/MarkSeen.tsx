'use client';

import { useEffect } from 'react';
import { markNotificationsSeen } from './actions';

/**
 * Opening the list marks everything shown as seen. Runs after the page is on screen, so the unread
 * items still show tinted this time; anything newer than `until` stays unread.
 */
export function MarkSeen({ until }: { until: string }) {
  useEffect(() => {
    void markNotificationsSeen({ until }).catch(() => {}); // tried again next time the list opens
  }, [until]);
  return null;
}
