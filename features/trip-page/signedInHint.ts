/**
 * A Supabase auth cookie is there (the same hint client.ts uses for app_opened). Only a guess for
 * cached pages that can't ask who is looking; identity itself is decided by /ingest.
 */
export function looksSignedIn(cookie: string = document.cookie): boolean {
  return /(^|;\s*)sb-(?:\w|-)+-auth-token(\.0)?=/.test(cookie);
}
