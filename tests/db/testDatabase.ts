import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Runs our real migrations + seed in an in-memory Postgres (PGlite), with small stand-ins for
// the schemas Supabase manages (auth, storage). Fast, no Docker. Covers access rules only;
// anything Supabase-specific should still be checked once against `supabase start`.

const SUPABASE_DIR = join(process.cwd(), 'supabase');

const SUPABASE_STANDINS = `
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create schema storage;

  create table auth.users (
    id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text,
    email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
    created_at timestamptz, updated_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table storage.buckets (
    id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;

  grant usage on schema public, auth, storage to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  -- Supabase's own defaults: everything new in public is open to every API role until a
  -- migration takes it away. Without these, a forgotten revoke passes here and leaks on Supabase.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const STORAGE_GRANTS = `
  grant select, insert, delete on storage.objects to anon, authenticated;
`;

type Options = {
  /** Apply only the first N migrations (in file order), e.g. 8 to test migration 8 on its own. */
  upTo?: number;
  /** Seed file under the repo root, or false for none. Defaults to supabase/seed.sql. */
  seed?: string | false;
};

export async function createTestDatabase({ upTo, seed = 'supabase/seed.sql' }: Options = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STANDINS);
  const allMigrations = readdirSync(join(SUPABASE_DIR, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const runMigrations = async (files: string[]) => {
    for (const file of files) await db.exec(readFileSync(join(SUPABASE_DIR, 'migrations', file), 'utf8'));
  };
  await runMigrations(allMigrations.slice(0, upTo));
  await db.exec(STORAGE_GRANTS);
  if (seed) await db.exec(readFileSync(join(process.cwd(), seed), 'utf8'));

  /** Applies the migrations after `upTo`, e.g. to test a backfill on older data. */
  const migrateRest = () => runMigrations(allMigrations.slice(upTo ?? allMigrations.length));

  /** Runs a query as a logged-out visitor (userId undefined) or as a signed-in user. */
  async function queryAs<T = Record<string, unknown>>(
    userId: string | undefined,
    sql: string,
    params: unknown[] = [],
  ) {
    const role = userId ? 'authenticated' : 'anon';
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
    await db.exec(`set role ${role}`);
    try {
      return (await db.query<T>(sql, params)).rows;
    } finally {
      await db.exec('reset role');
    }
  }

  /** Signs in as a user (with a matching auth.users row, as Supabase would have). */
  async function addUser(userId: string, email = `${userId.slice(-4)}@example.com`) {
    await db.query(`insert into auth.users (id, email, created_at) values ($1, $2, now())`, [userId, email]);
  }

  return { db, queryAs, addUser, migrateRest };
}

export const ALEX = '00000000-0000-4000-8000-000000000001'; // seeded user
export const STRANGER = '00000000-0000-4000-8000-000000000002';
export const NEWCOMER = '00000000-0000-4000-8000-000000000003';
export const ALEX_PUBLIC_TRIP = '00000000-0000-4000-8000-0000000000a1';
