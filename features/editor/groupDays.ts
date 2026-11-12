// Kept from the editor WIP: which trip day a photo belongs to.

const NIGHT_SHIFT_MS = 4 * 60 * 60 * 1000; // 1 a.m. photos belong to the night before

const pad = (value: number) => String(value).padStart(2, '0');

/** The trip day a photo belongs to, as "YYYY-MM-DD" in the phone's time zone. */
export function tripDateKey(takenAt: string): string {
  const shifted = new Date(Date.parse(takenAt) - NIGHT_SHIFT_MS);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

/** Whole days from one "YYYY-MM-DD" to another. */
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000);
}
