'use client';

import { track } from '@/lib/analytics/client';
import { QUEST_EDIT_ACTION_CODE } from '@/lib/analytics/codes';
import { photoLimitProperties, questEditProperties, type QuestEdit } from './createFlowProperties';
import { useDraft } from './draftStore';
import { NEED_THREE } from './pageEdits';

/**
 * quest_edit for one change on Review (or one that was refused), and the tally publishQuest sends
 * as edit_count and change_types. A remove refused below 3 photos is also a photo_limit_hit.
 */
export function reportEdit(edit: Omit<QuestEdit, 'questKey' | 'isPublished'>, refusedReason?: string) {
  const { key, published, recordEdit } = useDraft.getState();
  if (!key) return;
  track('quest_edit', questEditProperties({ ...edit, questKey: key, isPublished: published !== undefined }));
  if (edit.after) recordEdit(QUEST_EDIT_ACTION_CODE[edit.action]);
  else if (refusedReason === NEED_THREE) track('photo_limit_hit', photoLimitProperties('min', 'review', key));
}

/** The 15-photo message on Review's "+ Add photos". */
export function reportPhotoLimit() {
  const { key } = useDraft.getState();
  track('photo_limit_hit', photoLimitProperties('max', 'review', key));
}
