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
`;

// Public tables get no default grants here: our migrations must grant what the app needs.
const STORAGE_GRANTS = `
  grant select, insert, delete on storage.objects to anon, authenticated;
`;

export async function createTestDatabase() {
  const db = new PGlite();
  await db.exec(SUPABASE_STANDINS);
  const migrations = readdirSync(join(SUPABASE_DIR, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of migrations) await db.exec(readFileSync(join(SUPABASE_DIR, 'migrations', file), 'utf8'));
  await db.exec(STORAGE_GRANTS);
  await db.exec(readFileSync(join(SUPABASE_DIR, 'seed.sql'), 'utf8'));

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

  return { db, queryAs };
}

export const ALEX = '00000000-0000-4000-8000-000000000001'; // seeded user
export const STRANGER = '00000000-0000-4000-8000-000000000002';
export const ALEX_PUBLIC_TRIP = '00000000-0000-4000-8000-0000000000a1';
