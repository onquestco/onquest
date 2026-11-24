'use client';

import { useCallback, useEffect, useState } from 'react';
import { Toast } from '@/design-system/components/Toast';

/**
 * "Blog updated." after posting an edit (spec §6.1, decided 23 Nov). The composer lands here with
 * ?updated=1, which is dropped from the address straight away so a reload doesn't say it again.
 */
export function BlogUpdatedToast({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show);
  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!show) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('updated');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [show]);

  return visible ? <Toast message="Blog updated." onDismiss={dismiss} /> : null;
}
