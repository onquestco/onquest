// anon_id: a random device id in localStorage ("anon_<uuid>"), kept after sign-in so a person's
// events join up. session_id: new after 30 minutes without an event. Both also tell the caller
// when they were just created: a new anon id is app_opened.first_open_flg, a new session id is
// what fires app_opened (docs/specs/analytics-v2.md §4.2).

const ANON_KEY = 'oq_anon_id';
const SESSION_KEY = 'oq_session';
const SESSION_IDLE_MS = 30 * 60 * 1000;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export type Id = { id: string; created: boolean };

export function anonId(storage: Storage, createId: () => string): Id {
  try {
    const existing = storage.getItem(ANON_KEY);
    if (existing?.startsWith('anon_')) return { id: existing, created: false };
    const created = `anon_${createId()}`;
    storage.setItem(ANON_KEY, created);
    return { id: created, created: true };
  } catch {
    // Private mode or blocked storage: an id for this page only.
    return { id: `anon_${createId()}`, created: true };
  }
}

export function sessionId(storage: Storage, createId: () => string, now: number): Id {
  try {
    const saved = JSON.parse(storage.getItem(SESSION_KEY) ?? 'null') as { id: string; at: number } | null;
    const kept = saved && now - saved.at < SESSION_IDLE_MS ? saved.id : null;
    const id = kept ?? createId();
    storage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
    return { id, created: kept === null };
  } catch {
    return { id: createId(), created: true };
  }
}
