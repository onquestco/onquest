'use client';

import { useEffect, useState } from 'react';
import { Toast } from '@/design-system/components/Toast';

/** "Your account was deleted." on the landing page after ?deleted=1 (the page itself is static). */
export function DeletedNotice() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('deleted') !== '1') return;
    window.history.replaceState(null, '', window.location.pathname);
    // Read from the URL once, after load: the static page can't know.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the browser URL
    setShown(true);
  }, []);
  return shown ? <Toast message="Your account was deleted." onDismiss={() => setShown(false)} /> : null;
}
