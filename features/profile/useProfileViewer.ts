'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';

const ViewerSchema = z.object({ signedIn: z.boolean(), isSelf: z.boolean(), following: z.boolean() });
export type ProfileViewer = z.infer<typeof ViewerSchema>;
const SIGNED_OUT: ProfileViewer = { signedIn: false, isSelf: false, following: false };

/** Who is looking at this cached profile: asked after load, never cached (spec C §3.7). */
export function useProfileViewer(profileKey: string): ProfileViewer | null {
  const [viewer, setViewer] = useState<ProfileViewer | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/profiles/${profileKey}/me`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json())
      .then((body: unknown) => {
        const parsed = ViewerSchema.safeParse(body);
        setViewer(parsed.success ? parsed.data : SIGNED_OUT);
      })
      .catch(() => {
        if (!controller.signal.aborted) setViewer(SIGNED_OUT);
      });
    return () => controller.abort();
  }, [profileKey]);
  return viewer;
}
