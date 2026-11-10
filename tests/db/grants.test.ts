import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './testDatabase';

// Who may call each function in `public`. Supabase opens every new function to every API role,
// so a function missing here fails the test until someone decides who should call it.
const PUBLIC_PAGES = ['anon', 'authenticated'];
const SIGNED_IN = ['authenticated'];
const SERVER = ['service_role'];
const NOBODY: string[] = [];

const EXPECTED: Record<string, string[]> = {
  get_trip: PUBLIC_PAGES,
  get_profile: PUBLIC_PAGES,
  list_sitemap_trips: PUBLIC_PAGES,
  get_trip_social: PUBLIC_PAGES,
  get_trip_status: PUBLIC_PAGES,
  resolve_handle: PUBLIC_PAGES,
  list_quest_cards: PUBLIC_PAGES,
  list_sitemap_profiles: PUBLIC_PAGES,
  list_trending_quests: PUBLIC_PAGES,
  list_place_chips: PUBLIC_PAGES,
  search_public: PUBLIC_PAGES,

  is_handle_available: SIGNED_IN,
  save_profile: SIGNED_IN,
  create_trip: SIGNED_IN,
  save_trip_draft: SIGNED_IN,
  publish_trip: SIGNED_IN,
  set_trip_visibility: SIGNED_IN,
  set_trip_comments: SIGNED_IN,
  delete_trip: SIGNED_IN,
  set_like: SIGNED_IN,
  post_comment: SIGNED_IN,
  delete_comment: SIGNED_IN,
  get_my_quest_state: SIGNED_IN,
  list_my_notifications: SIGNED_IN,
  count_unread_notifications: SIGNED_IN,
  mark_notifications_seen: SIGNED_IN,
  set_follow: SIGNED_IN,
  get_my_follow_state: SIGNED_IN,
  list_follows: SIGNED_IN,
  get_my_quest_counts: SIGNED_IN,
  list_my_comment_trip_keys: SIGNED_IN,
  save_profile_settings: SIGNED_IN,
  list_feed: SIGNED_IN,
  list_suggested_quests: SIGNED_IN,
  list_travellers_to_follow: SIGNED_IN,

  geocode_cache_get: SERVER,
  geocode_cache_put: SERVER,
  claim_geocoder_slot: SERVER,
  run_retention_cleanup: SERVER,
  get_unavailable_trip_key: SERVER,
  claim_email_budget: SERVER,
  save_profile_settings_as_admin: SERVER,
  mark_account_deleted: SERVER,
  delete_account_data: SERVER,
  list_pending_deletions: SERVER,

  is_reserved_handle: NOBODY,
  trip_url_hash: NOBODY,
  require_user: NOBODY,
  raise_missing: NOBODY,
  archive_trip: NOBODY,
  insert_trip: NOBODY,
  archive_draft: NOBODY,
  can_see_trip: NOBODY,
  person_json: NOBODY,
  quest_card_json: NOBODY,
  quest_score: NOBODY,
  public_quests_scored: NOBODY,
};

type GrantRow = { name: string; anon: boolean; authenticated: boolean; service_role: boolean };
type TableRow = { name: string; grantee: string; privilege: string };

describe('function and table grants (with Supabase default privileges)', () => {
  let functions: GrantRow[];
  let tableGrants: TableRow[];

  beforeAll(async () => {
    const { db } = await createTestDatabase();
    functions = (
      await db.query<GrantRow>(`
        select p.proname as name,
          has_function_privilege('anon', p.oid, 'execute') as anon,
          has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
          has_function_privilege('service_role', p.oid, 'execute') as service_role
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'`)
    ).rows;
    tableGrants = (
      await db.query<TableRow>(`
        select table_name as name, grantee, privilege_type as privilege
        from information_schema.role_table_grants
        where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')`)
    ).rows;
  });

  it('lists every function in public', () => {
    expect(functions.map((row) => row.name).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('lets each role call only what it should', () => {
    for (const row of functions) {
      const allowed = (['anon', 'authenticated', 'service_role'] as const).filter((role) => row[role]);
      expect({ name: row.name, allowed }).toEqual({ name: row.name, allowed: EXPECTED[row.name] });
    }
  });

  it('gives signed-out visitors no table access', () => {
    expect(tableGrants.filter((grant) => grant.grantee === 'anon')).toEqual([]);
  });

  it('gives no role TRUNCATE, TRIGGER or REFERENCES', () => {
    const risky = tableGrants.filter((grant) =>
      ['TRUNCATE', 'TRIGGER', 'REFERENCES'].includes(grant.privilege),
    );
    expect(risky).toEqual([]);
  });

  it('starts functions and tables created later with no access', async () => {
    const { db } = await createTestDatabase({ seed: false });
    await db.exec(`
      create function public.later() returns int language sql as 'select 1';
      create table public.later_table (key uuid primary key);`);
    const fn = await db.query<{ anon: boolean; authenticated: boolean }>(`
      select has_function_privilege('anon', 'public.later()', 'execute') as anon,
        has_function_privilege('authenticated', 'public.later()', 'execute') as authenticated`);
    expect(fn.rows[0]).toEqual({ anon: false, authenticated: false });
    const table = await db.query(`
      select 1 from information_schema.role_table_grants
      where table_name = 'later_table' and grantee in ('anon', 'authenticated', 'service_role')`);
    expect(table.rows).toEqual([]);
  });
});
