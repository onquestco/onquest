import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { V1_RENAMES, renameV1Event, type V1Properties } from './renameMap';
import { CLIENT_EVENTS, SERVER_EVENTS } from './taxonomy';
import { readEventRows, type PropertyRule } from './taxonomyFromCsv';
import { validateEvent } from './validate';

const v1Events: Record<string, Record<string, PropertyRule>> = { ...CLIENT_EVENTS, ...SERVER_EVENTS };
const read = (...path: string[]) => readFileSync(join(process.cwd(), ...path), 'utf8');

/** One v1 payload per allowed value of each property, so every mapped value is exercised. */
function v1Samples(rules: Record<string, PropertyRule>): V1Properties[] {
  const sample = (rule: PropertyRule): string | number | boolean => {
    const first = rule.values?.[0];
    if (first !== undefined) return first;
    if (rule.type === 'BOOL') return true;
    if (rule.type === 'INT64') return rule.min ?? 1;
    if (rule.type === 'FLOAT64') return 1.5;
    return 'k3f9x2';
  };
  const base = Object.fromEntries(Object.entries(rules).map(([name, rule]) => [name, sample(rule)]));
  const variants = Object.entries(rules).flatMap(([name, rule]) => [
    ...(rule.values ?? []).map((value) => ({ ...base, [name]: value })),
    ...(rule.type === 'BOOL' ? [{ ...base, [name]: false }] : []),
  ]);
  return [base, ...variants];
}

describe('V1_RENAMES', () => {
  it('covers the 14 live v1 events, all of them in the v1 taxonomy', () => {
    expect(Object.keys(V1_RENAMES).sort()).toEqual([
      'blog_comment_posted',
      'blog_create_started',
      'blog_deleted',
      'blog_draft_saved',
      'blog_liked',
      'blog_managed',
      'blog_previewed',
      'blog_published',
      'blog_quest_linked',
      'blog_quest_opened',
      'blog_read_end',
      'blog_viewed',
      'create_option_tapped',
      'legal_page_viewed',
    ]);
    expect(Object.keys(V1_RENAMES).filter((name) => !v1Events[name])).toEqual([]);
  });

  it('maps onto exactly the Live and renamed events of the v2 sheet', () => {
    const live = new Set(
      readEventRows(read('docs', 'analytics', 'v2', 'events.csv'))
        .filter((row) => row.status.startsWith('Live'))
        .map((row) => row.event),
    );
    const targets = new Set(
      Object.keys(V1_RENAMES).flatMap((name) =>
        v1Samples(v1Events[name] ?? {}).flatMap((sample) => renameV1Event(name, sample)?.name ?? []),
      ),
    );
    expect([...targets].sort()).toEqual([...live].sort());
  });

  it('gives only valid v2 properties and values for every v1 value', () => {
    for (const name of Object.keys(V1_RENAMES)) {
      for (const sample of v1Samples(v1Events[name] ?? {})) {
        const renamed = renameV1Event(name, sample);
        if (!renamed) continue;
        const { problems } = validateEvent(renamed.name, renamed.properties);
        // Properties v1 never had (e.g. blog_viewed.author_user_id) are AN-02's to fill.
        expect({ name, problems: problems.filter((problem) => !problem.endsWith(': missing')) }).toEqual({
          name,
          problems: [],
        });
      }
    }
  });

  it('follows the spec §5.3 table', () => {
    expect(renameV1Event('create_option_tapped', { option: 'blog', available: false })).toEqual({
      name: 'create_option_click',
      properties: { option: 1, available_flg: false },
    });
    expect(renameV1Event('blog_managed', { blog_id: 'b1', action: 'visibility', value: 'private' })).toEqual({
      name: 'visibility_changed',
      properties: { content_type: 1, content_id: 'b1', to_visibility: 2 },
    });
    expect(renameV1Event('blog_managed', { blog_id: 'b1', action: 'comments', value: 'off' })?.properties).toEqual({
      content_type: 1,
      content_id: 'b1',
      comments_on_flg: false,
    });
    expect(renameV1Event('blog_managed', { blog_id: 'b1', action: 'delete', value: 'none' })?.name).toBe(
      'content_deleted',
    );
    expect(renameV1Event('blog_managed', { blog_id: 'b1', action: 'edit', value: 'none' })).toEqual({
      name: 'blog_updated',
      properties: { blog_id: 'b1' },
    });
    expect(renameV1Event('blog_deleted', { blog_id: 'b1', status: 'draft', photos: 3 })?.properties).toEqual({
      content_type: 1,
      content_id: 'b1',
      was_published_flg: false,
      photo_count: 3,
    });
    expect(renameV1Event('blog_liked', { blog_id: 'b1', unlike: true, source: 'after_sign_in' })?.properties).toEqual(
      { content_type: 1, content_id: 'b1', unlike_flg: true, source: 3 },
    );
    expect(renameV1Event('legal_page_viewed', { page: 'terms', source: 'footer' })?.properties).toEqual({
      page: 1,
      source: 2,
    });
    expect(renameV1Event('blog_quest_linked', { blog_id: 'b1', action: 'remove' })?.properties.action).toBe(7);
    expect(renameV1Event('blog_previewed', { blog_id: 'b1' })?.properties.action).toBe(5);
    expect(renameV1Event('blog_viewed', { referrer: 'instagram', signed_in: true })?.properties).toMatchObject({
      referrer: 2,
      signed_in_flg: true,
    });
    expect(renameV1Event('blog_quest_opened', { blog_id: 'b1', view_id: 'v1' })?.name).toBe('blog_quest_click');
  });

  it('returns null for names that were never live and unknown blog_managed actions', () => {
    expect(renameV1Event('photos_picked', {})).toBeNull();
    expect(renameV1Event('toString', {})).toBeNull();
    expect(renameV1Event('blog_managed', { action: 'archive' })).toBeNull();
  });

  it('is mirrored in the BigQuery view, which maps every v1 name', () => {
    const sql = read('docs', 'analytics', 'bigquery', 'events_people_all.sql');
    expect(Object.keys(V1_RENAMES).filter((name) => name !== 'blog_read_end' && !sql.includes(`'${name}'`))).toEqual(
      [],
    );
  });
});
