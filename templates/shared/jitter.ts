/** Small, fast seeded PRNG (mulberry32). Same seed → same sequence. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/**
 * A small rotation (in degrees, between -maxDeg and +maxDeg) that is stable for a given
 * trip seed + key, so the page looks the same on every visit. "Shuffle" = new seed.
 */
export function jitter(seed: number, key: string, maxDeg = 2): number {
  const random = seededRandom(seed ^ hashString(key));
  return Math.round((random() * 2 - 1) * maxDeg * 10) / 10;
}
