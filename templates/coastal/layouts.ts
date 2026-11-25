// Photo positions, from the design's `L` table and cover() in docs/reference/templates/coastal.html.
// The design's page is 9:15; ours is 9:14 (templates spec D1), so a page is a little shorter for
// the same width. x and width are unchanged; y values were checked by eye so the lowest photo of
// each layout still clears the bottom edge (the 3-photo third photo and the 2-photo second photo
// moved up a little).

export type Slot = { x: number; y: number; width: number; aspect: number; rotate: number };

/** One layout per photo count, so a page with 1 or 2 photos still fills the page. */
export const PAGE_LAYOUTS: Record<1 | 2 | 3, Slot[]> = {
  1: [{ x: 9, y: 25, width: 82, aspect: 0.82, rotate: -2 }],
  2: [
    { x: 5, y: 22, width: 62, aspect: 0.95, rotate: -4 },
    { x: 36, y: 53, width: 58, aspect: 1.05, rotate: 5 },
  ],
  3: [
    { x: 4, y: 23, width: 58, aspect: 1, rotate: -4 },
    { x: 44, y: 38, width: 52, aspect: 0.95, rotate: 5 },
    { x: 8, y: 62, width: 46, aspect: 1.15, rotate: -2 },
  ],
};

/** The cover's three prints, back to front: right, left, then the big one in the middle. */
export const COVER_LAYOUT = {
  right: { x: 52, y: 42, width: 44, aspect: 1, rotate: 8 },
  left: { x: 3, y: 44, width: 44, aspect: 1, rotate: -9 },
  main: { x: 17, y: 31, width: 64, aspect: 0.95, rotate: -2 },
} satisfies Record<string, Slot>;
