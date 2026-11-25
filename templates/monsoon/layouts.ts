// Photo positions, from the design's `L` table and cover() in docs/reference/templates/roadtrip.html,
// which the Monsoon design shares except for its cover. The design's page is 9:15; ours is 9:14
// (templates spec D1), so the photo pages use Roadtrip's re-fit (templates/roadtrip/layouts.ts).

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

/**
 * The cover's single print (the design's `single: true`: no side polaroids). The design has it at
 * (14, 47), 60 wide. On the shorter 9:14 page it is 2 points narrower, like Roadtrip's 1-photo print,
 * and 1 point higher, so it still shows the lightning under the cloud and ends at about the same share
 * of the page height as in the design.
 */
export const COVER_SLOT: Slot = { x: 15, y: 46, width: 58, aspect: 0.95, rotate: -2 };
