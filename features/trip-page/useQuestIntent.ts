'use client';

import { useEffect, useRef } from 'react';
import { intentStep, readQuestIntent, withoutIntent } from './questIntent';
import { useQuestSocial } from './useQuestSocial';

/**
 * Finishes what a signed-out person tapped before signing in (M10, M11): the like is counted, or
 * the comment box is open. Runs once, after the viewer is known, then drops ?intent from the URL.
 */
export function useQuestIntent() {
  const { viewer, viewerKnown, liked, toggleLike, setComposerOpen } = useQuestSocial();
  const done = useRef(false);

  useEffect(() => {
    if (!viewerKnown || done.current) return;
    done.current = true;
    const { pathname, search, hash } = window.location;
    const step = intentStep(readQuestIntent(search), { signedIn: viewer.signedIn, liked });
    if (search.includes('intent=')) {
      window.history.replaceState(null, '', withoutIntent(pathname, search, hash));
    }

    if (step === 'like') toggleLike('after_sign_in');
    if (step === 'open_comments') {
      setComposerOpen(true);
      document.getElementById('comments')?.scrollIntoView({ block: 'start' });
    }
  }, [viewerKnown, viewer.signedIn, liked, toggleLike, setComposerOpen]);
}
