import { describe, expect, it } from 'vitest';
import { QUEST_SOURCE_CODE } from '@/lib/analytics/codes';
import { expectNoProblems } from '@/lib/analytics/validate';
import {
  createAbandonedProperties,
  createStepForPath,
  draftResumedProperties,
  previewExitProperties,
  publishAnalytics,
  questPreviewProperties,
  resumedSourceForTile,
  templateSelectProperties,
} from './createFlowLaterProperties';

const KEY = '00000000-0000-4000-8000-0000000000c1';
const NOW = new Date('2026-11-27T10:30:00Z');

describe('template_select and quest_preview', () => {
  it('send template codes', () => {
    expect(templateSelectProperties(KEY, 'alpine', 'coastal')).toEqual({ quest_id: KEY, template: 1, prev_template: 0 });
    expectNoProblems('template_select', templateSelectProperties(KEY, 'alpine', 'coastal'));
    // A retired look on an old draft keeps its own code.
    expect(templateSelectProperties(KEY, 'coastal', 'beach').prev_template).toBe(6);
    expect(questPreviewProperties(KEY, 'desert', 4)).toEqual({ quest_id: KEY, template: 5, page_count: 4 });
    expectNoProblems('quest_preview', questPreviewProperties(KEY, 'desert', 4));
  });
});

describe('preview_exit', () => {
  it('counts the cover as seen', () => {
    expect(previewExitProperties(KEY, 'back_to_edit', 0)).toEqual({ quest_id: KEY, action: 0, pages_seen: 1 });
    expect(previewExitProperties(KEY, 'publish', 4)).toEqual({ quest_id: KEY, action: 1, pages_seen: 4 });
    expectNoProblems('preview_exit', previewExitProperties(KEY, 'publish', 7));
  });
});

describe('draft_resumed', () => {
  it('knows Home and the Quests tab from the tile’s link source, and nothing else', () => {
    expect(resumedSourceForTile(QUEST_SOURCE_CODE.your_quests_home)).toBe('home');
    expect(resumedSourceForTile(QUEST_SOURCE_CODE.quests_tab)).toBe('quests_tab');
    expect(resumedSourceForTile(QUEST_SOURCE_CODE.profile)).toBeUndefined();
    expect(resumedSourceForTile(undefined)).toBeUndefined();
  });

  it('sends whole days since the last save, for Quests and blogs', () => {
    const quest = draftResumedProperties({
      contentType: 'quest',
      key: KEY,
      source: 'manage_menu',
      savedAt: '2026-11-24T09:00:00Z',
      now: NOW,
    });
    expect(quest).toEqual({ content_type: 0, content_id: KEY, source: 2, days_since_last_edit: 3 });
    expectNoProblems('draft_resumed', quest);
    const blog = draftResumedProperties({ contentType: 'blog', key: KEY, source: 'manage_menu', savedAt: undefined, now: NOW });
    expect(blog).toMatchObject({ content_type: 1, source: 2, days_since_last_edit: undefined });
  });
});

describe('quest_create_abandoned', () => {
  it('maps every create path to its step, and nothing outside the flow', () => {
    expect(createStepForPath('/quests/new', false)).toBe('pick');
    expect(createStepForPath(`/quests/${KEY}/arrange`, false)).toBe('arranging');
    expect(createStepForPath(`/quests/${KEY}/review`, false)).toBe('review');
    expect(createStepForPath(`/quests/${KEY}/template`, false)).toBe('template');
    expect(createStepForPath(`/quests/${KEY}/preview`, false)).toBe('preview');
    expect(createStepForPath(`/quests/${KEY}/preview`, true)).toBe('publish_sheet');
    for (const path of [`/quests/${KEY}/share`, `/quests/${KEY}/export`, '/quests', '/home']) {
      expect(createStepForPath(path, false)).toBeUndefined();
    }
  });

  it('has no key before Next, and seconds from the start', () => {
    const onPick = createAbandonedProperties({
      step: 'pick',
      photoCount: 2,
      startedAtMs: NOW.getTime() - 95_400,
      now: NOW,
    });
    expect(onPick).toEqual({ quest_id: undefined, step: 0, photo_count: 2, seconds_since_start: 95 });
    expectNoProblems('quest_create_abandoned', onPick);
    const onPreview = createAbandonedProperties({
      questKey: KEY,
      step: 'publish_sheet',
      photoCount: 9,
      startedAtMs: undefined, // an old draft without startedAt
      now: NOW,
    });
    expect(onPreview).toMatchObject({ quest_id: KEY, step: 5, seconds_since_start: undefined });
  });
});

describe('publishQuest analytics', () => {
  it('sends unique, sorted change types, and none when nothing changed', () => {
    expect(publishAnalytics(4, 3, [7, 1, 7])).toEqual({ clickLoc: 4, editCount: 3, changeTypes: [1, 7] });
    expect(publishAnalytics(undefined, 0, [])).toEqual({ clickLoc: undefined, editCount: 0, changeTypes: undefined });
  });
});
