// Photo positions, from the design's `L` table and cover() in docs/reference/templates/mountain.html.
// The design's page is 9:15; ours is 9:14 (templates spec D1), so a page is a little shorter for the
// same width. Checked against the polaroid's height (photo + 12.6cqw of frame) so the lowest photo of
// each layout ends about where it does in the design (~94% of the page): the 1-photo print is 2%
// narrower, and every y moved up 2–4 points, as Coastal's did.

export type Slot = { x: number; y: number; width: number; aspect: number; rotate: number };

/** One layout per photo count, so a page with 1 or 2 photos still fills the page. */
export const PAGE_LAYOUTS: Record<1 | 2 | 3, Slot[]> = {
  1: [{ x: 10, y: 23, width: 80, aspect: 0.82, rotate: -2 }],
  2: [
    { x: 5, y: 23, width: 62, aspect: 0.95, rotate: -4 },
    { x: 36, y: 51, width: 58, aspect: 1.05, rotate: 5 },
  ],
  3: [
    { x: 4, y: 23, width: 58, aspect: 1, rotate: -4 },
    { x: 44, y: 38, width: 52, aspect: 0.95, rotate: 5 },
    { x: 8, y: 60, width: 46, aspect: 1.1, rotate: -2 },
  ],
};

/** The cover's three prints, back to front: right, left, then the big one in the middle. */
export const COVER_LAYOUT = {
  right: { x: 53, y: 45, width: 43, aspect: 1, rotate: 8 },
  left: { x: 4, y: 47, width: 43, aspect: 1, rotate: -9 },
  main: { x: 17, y: 36, width: 64, aspect: 0.95, rotate: -2 },
} satisfies Record<string, Slot>;
