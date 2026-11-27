'use client';

import { looksSignedIn } from '@/features/account/signInPrompt';
import { track } from '@/lib/analytics/client';
import { createQuestClickProperties, type CreateClick } from './createFlowProperties';

/**
 * create_quest_click from any link into Pick photos. signed_in_flg uses the same cookie check the
 * sign-in popup uses to decide whether to open, so it is false exactly when the popup comes first.
 */
export function trackCreateClick(click: Omit<CreateClick, 'signedIn'>) {
  track('create_quest_click', createQuestClickProperties({ ...click, signedIn: looksSignedIn() }));
}
