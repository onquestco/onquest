import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLIENT_EVENTS, SERVER_EVENTS } from './taxonomy';
import {
  OPTIONAL_OVERRIDES,
  commonPropertiesFromCsv,
  parseCsv,
  readEventRows,
  renderTaxonomyModule,
  renderTaxonomyV2Module,
  taxonomyFromCsv,
  taxonomyV2FromCsv,
  type EventRule,
} from './taxonomyFromCsv';
import { COMMON_PROPERTIES, EVENTS } from './taxonomyV2';

const csv = (name: string) => readFileSync(join(process.cwd(), 'docs', 'analytics', `${name}.csv`), 'utf8');
const generated = (name: string) => readFileSync(join(process.cwd(), 'lib', 'analytics', name), 'utf8');

describe('taxonomy.ts', () => {
  it('matches the CSV export (run npm run analytics after re-exporting the sheet)', () => {
    const expected = renderTaxonomyModule(
      taxonomyFromCsv(csv('client-events')),
      taxonomyFromCsv(csv('server-events')),
    );
    expect(generated('taxonomy.ts')).toBe(expected);
  });

  it('reads enums, ranges, comma lists and events with common properties only', () => {
    expect(CLIENT_EVENTS.app_opened.entry).toEqual({
      type: 'STRING',
      required: true,
      values: ['direct', 'shared_link', 'email', 'notification'],
    });
    expect(CLIENT_EVENTS.photos_picked.count).toMatchObject({ type: 'INT64', min: 3, max: 15 });
    expect(SERVER_EVENTS.profile_updated.fields).toMatchObject({
      list: ['name', 'username', 'photo', 'city', 'bio'],
    });
    expect(CLIENT_EVENTS.settings_viewed).toEqual({});
  });
});

describe('taxonomyV2.ts', () => {
  const header = csv('v2/events').split('\n')[0];
  const events: Record<string, EventRule> = EVENTS;

  it('matches the v2 CSV export (run npm run analytics after re-exporting the sheet)', () => {
    const expected = renderTaxonomyV2Module(
      taxonomyV2FromCsv(csv('v2/events')),
      commonPropertiesFromCsv(csv('v2/common')),
    );
    expect(generated('taxonomyV2.ts')).toBe(expected);
  });

  it('has the sheet’s 72 events: 1 Live, 14 renamed, 57 to build', () => {
    const statuses = new Map(readEventRows(csv('v2/events')).map((row) => [row.event, row.status]));
    const count = (status: string) => [...statuses.values()].filter((value) => value === status).length;
    expect(Object.keys(EVENTS)).toHaveLength(72);
    expect(statuses.size).toBe(72);
    expect([count('Live'), count('Live – rename'), count('To build')]).toEqual([1, 14, 57]);
  });

  it('reads ranges, open ranges, code values, string values and comma lists', () => {
    expect(EVENTS.app_opened.properties.landing_page).toEqual({ type: 'INT64', required: true, min: 0, max: 6 });
    expect(EVENTS.feed_load_more_click.properties.page_no).toEqual({ type: 'INT64', required: true, min: 2 });
    expect(EVENTS.app_opened.properties.entry_type).toEqual({ type: 'INT64', required: true, values: [0, 1, 2, 4] });
    expect(EVENTS.sign_in_click.properties.method).toEqual({
      type: 'STRING',
      required: true,
      values: ['google', 'email_link'],
    });
    expect(EVENTS.setting_changed.properties.value.values).toEqual(['true', 'false', '0', '1', '2']);
    expect(EVENTS.profile_updated.properties.fields_changed.list).toEqual(['name', 'username', 'photo', 'city', 'bio']);
    expect(EVENTS.quest_updated.properties.change_types.list).toEqual(
      Array.from({ length: 12 }, (_, code) => String(code)),
    );
    expect(EVENTS.sign_in_click.properties.client_ts).toEqual({ type: 'TIMESTAMP', required: true });
    expect(EVENTS.quest_creation_complete.properties.minutes_since_start).toEqual({ type: 'FLOAT64', required: true });
    expect(EVENTS.home_viewed.properties.feed_empty_flg).toEqual({ type: 'BOOL', required: true });
  });

  it('gives every free STRING its pattern', () => {
    expect(EVENTS.quest_viewed.properties.quest_id).toEqual({ type: 'STRING', required: true, pattern: 'key' });
    expect(EVENTS.blog_viewed.properties.view_id.pattern).toBe('key');
    expect(EVENTS.search.properties.chip_name.pattern).toBe('town');
    expect(EVENTS.app_opened.properties.utm_source.pattern).toBe('utm');
  });

  it('reads who each event is about, its type, and events with common properties only', () => {
    expect(EVENTS.notification_sent).toMatchObject({ type: 'server', user: 'other_user' });
    expect(EVENTS.app_opened).toMatchObject({ type: 'view', user: 'optional' });
    expect(EVENTS.user_signed_up).toMatchObject({ type: 'server', user: 'signed_in' });
    expect(EVENTS.quest_view_ended).toMatchObject({ type: 'client', user: 'optional' });
    expect(EVENTS.feedback_click).toEqual({ type: 'click', user: 'signed_in', properties: {} });
  });

  it('fails on a free STRING that isn’t a key, town, utm tag or code list (no user text)', () => {
    const row = '"x",bad_event,user_id,anon_id,session_id,click,server_ts,title,STRING,,The title,,To build,,,';
    expect(() => taxonomyV2FromCsv(`${header}\n${row}\n`)).toThrow(/bad_event\.title: a free STRING/);
  });

  it('fails on an unknown event type, user_id form or data type', () => {
    const row = (type: string, user: string, dataType: string) =>
      `"x",an_event,${user},anon_id,session_id,${type},server_ts,count,${dataType},,,,To build,,,`;
    expect(() => taxonomyV2FromCsv(`${header}\n${row('tap', 'user_id', 'INT64')}`)).toThrow(/unknown type/);
    expect(() => taxonomyV2FromCsv(`${header}\n${row('click', 'someone', 'INT64')}`)).toThrow(/unknown user_id/);
    expect(() => taxonomyV2FromCsv(`${header}\n${row('click', 'user_id', 'NUMBER')}`)).toThrow(/data type/);
  });

  it('makes exactly these properties optional, for these reasons', () => {
    const optional: Record<string, string> = {};
    for (const [event, rule] of Object.entries(events)) {
      for (const [property, propertyRule] of Object.entries(rule.properties)) {
        if (propertyRule.required) continue;
        const override = OPTIONAL_OVERRIDES[`${event}.${property}`] ?? OPTIONAL_OVERRIDES[property];
        optional[`${event}.${property}`] = override ? override.kind : 'sheet wording';
      }
    }
    const sheet = 'sheet wording';
    expect(optional).toEqual({
      'app_opened.utm_source': 'permanent',
      'blog_editor_action.blocked_flg': 'temporary',
      'blog_editor_action.photo_count': 'temporary',
      'blog_published.is_first_blog_flg': 'temporary',
      'blog_published.minutes_since_start': 'permanent',
      'blog_unavailable.blog_id': sheet,
      'blog_updated.days_since_post': 'temporary',
      'blog_viewed.read_time_min': 'temporary',
      'blog_viewed.source': 'permanent',
      'comment_posted.is_owner_flg': 'temporary',
      'comment_posted.owner_user_id': 'temporary',
      'comments_toggled.comment_count': 'temporary',
      'content_deleted.age_days': 'temporary',
      'content_deleted.comment_count': 'temporary',
      'content_deleted.like_count': 'temporary',
      'content_deleted.photo_count': 'temporary',
      'content_liked.owner_user_id': 'temporary',
      'create_option_click.from_screen': 'temporary',
      'create_quest_click.content_id': sheet,
      'error_shown.attempt': 'permanent',
      'error_shown.content_id': sheet,
      'guide_viewed.source': 'permanent',
      'instagram_export.slide_count': sheet,
      'notification_click.kind': sheet,
      'photo_limit_hit.quest_id': sheet,
      'profile_tab_click.filter': sheet,
      'profile_viewed.source': 'permanent',
      'quest_create_abandoned.quest_id': sheet,
      'quest_edit.caption_was_auto_flg': sheet,
      'quest_edit.page_no': sheet,
      'quest_unavailable.quest_id': sheet,
      'quest_viewed.position': sheet,
      'quest_viewed.source': 'permanent',
      'search.chip_name': sheet,
      'user_signed_in.days_since_last_sign_in': 'permanent',
      'user_signed_up.first_seen_ts': 'permanent',
      'user_signed_up.referrer_blog_id': 'permanent',
      'user_signed_up.referrer_content_type': sheet,
      'user_signed_up.referrer_owner_user_id': 'permanent',
      'user_signed_up.referrer_quest_id': 'permanent',
      'visibility_changed.days_since_publish': 'temporary',
      'visibility_changed.from_visibility': 'permanent',
    });
  });

  it('reads only sentence-level wording for optional, not code meanings', () => {
    // "3 = Place (reserved)" and "5 = Feed (reserved)" are codes, not the property being optional.
    expect(EVENTS.quest_edit.properties.action.required).toBe(true);
    expect(EVENTS.user_followed.properties.source.required).toBe(true);
    expect(EVENTS.username_rejected.properties.reason.required).toBe(true);
    // "(count only)" and "Draft menus only offer …" don't say the property can be absent.
    expect(EVENTS.photos_selected.properties.with_location_count.required).toBe(true);
    expect(EVENTS.manage_menu_open.properties.is_draft_flg.required).toBe(true);
    // "…; null when action = 0" and "Quests tab only: …; null on profile" do.
    expect(EVENTS.notification_click.properties.kind.required).toBe(false);
    expect(EVENTS.profile_tab_click.properties.filter.required).toBe(false);
  });

  it('lists the common properties of spec §4.2 (common.csv plus env and type)', () => {
    expect(COMMON_PROPERTIES).toEqual([
      'anon_id',
      'app_version',
      'browser',
      'client_ts',
      'country',
      'env',
      'event_id',
      'is_bot_flg',
      'os',
      'platform',
      'screen',
      'session_id',
      'type',
      'user_id',
      'user_info',
    ]);
  });
});

describe('parseCsv', () => {
  it('handles quotes, commas in quotes and escaped quotes', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });
});
