/**
 * blog_draft_saved fires at most once per calendar minute per blog (blogs spec §4.2, unchanged in
 * analytics v2). The action keeps
 * no state, so it compares the minute of the save it was based on with the minute of the new one,
 * both as the database returned them. The create save (no basedOn) always counts.
 */
export function shouldTrackDraftSave(basedOn: string | null, savedAt: string): boolean {
  if (basedOn === null) return true;
  const minute = (timestamp: string) => Math.floor(new Date(timestamp).getTime() / 60_000);
  const before = minute(basedOn);
  const after = minute(savedAt);
  // Unreadable timestamps: count it rather than lose the event.
  if (Number.isNaN(before) || Number.isNaN(after)) return true;
  return before !== after;
}
