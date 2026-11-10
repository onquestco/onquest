'use client';

import { useState, type ReactNode } from 'react';
import type { QuestSocial, ViewerState } from '@/lib/social/schema';
import { sampleSocialActions } from './sampleSocialActions';
import { QuestSocialProvider } from './useQuestSocial';

type Props = {
  tripKey: string;
  path: string;
  initial: QuestSocial;
  viewer: ViewerState;
  children: ReactNode;
};

/** Sample likes and comments that behave like the real thing. B-07 replaces it with the server actions. */
export function DemoSocialProvider({ initial, viewer, ...rest }: Props) {
  const [actions] = useState(() => sampleSocialActions(initial.likeCount, { name: 'You', handle: 'you' }));
  return <QuestSocialProvider initial={initial} viewer={viewer} actions={actions} {...rest} />;
}
