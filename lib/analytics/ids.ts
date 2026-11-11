// anon_id: a random device id in localStorage ("anon_<uuid>"), kept after sign-in so a person's
// events join up. session_id: new after 30 minutes without an event. No cookies.

const ANON_KEY = 'oq_anon_id';
const SESSION_KEY = 'oq_session';
const SESSION_IDLE_MS = 30 * 60 * 1000;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export function anonId(storage: Storage, createId: () => string): string {
  try {
    const existing = storage.getItem(ANON_KEY);
    if (existing?.startsWith('anon_')) return existing;
    const created = `anon_${createId()}`;
    storage.setItem(ANON_KEY, created);
    return created;
  } catch {
    // Private mode or blocked storage: an id for this page only.
    return `anon_${createId()}`;
  }
}

export function sessionId(storage: Storage, createId: () => string, now: number): string {
  try {
    const saved = JSON.parse(storage.getItem(SESSION_KEY) ?? 'null') as { id: string; at: number } | null;
    const id = saved && now - saved.at < SESSION_IDLE_MS ? saved.id : createId();
    storage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
    return id;
  } catch {
    return createId();
  }
}
