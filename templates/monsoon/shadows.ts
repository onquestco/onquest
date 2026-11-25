// The design draws its bands, clouds and lightning with filter="url(#cut)", a live drop shadow
// (dy 3, blur 3, black at .38). Live SVG filters are slow on low-end phones and the Instagram
// export can't capture url(#filter) reliably (templates spec D3), so each shape's shadow was
// rendered once in headless Chrome, from the design's own shapes and filter, and packed into one
// WebP, public/templates/monsoon/shadows.webp (1 px per design unit; the part a shape covers itself
// is left empty). Each page draws a shape's shadow from this table just before the shape, in the
// design's order, so a band's shadow still falls on the band under it.
//
// x, y, width, height: where the shadow sits in the design's 390 × 650 box.
// sx, sy: where it is in the WebP. Regenerate both together if a shape here ever changes.

export const SHADOWS = '/templates/monsoon/shadows.webp';
export const SHADOWS_WIDTH = 432;
export const SHADOWS_HEIGHT = 1010;

export type ShadowCell = { x: number; y: number; width: number; height: number; sx: number; sy: number };

export const SHADOW_CELLS = {
  'cover-band-70': { x: -20, y: 55, width: 430, height: 34, sx: 0, sy: 604 },
  'cover-band-44': { x: -20, y: 30, width: 430, height: 32, sx: 0, sy: 709 },
  'cover-cloud': { x: 184, y: 180, width: 187, height: 120, sx: 214, sy: 0 },
  'cover-bolt': { x: 279, y: 259, width: 42, height: 85, sx: 138, sy: 250 },
  'cover-band-626': { x: -20, y: 615, width: 430, height: 25, sx: 0, sy: 985 },
  'storm-band-140': { x: -20, y: 123, width: 430, height: 38, sx: 0, sy: 339 },
  'storm-band-112': { x: -20, y: 95, width: 430, height: 38, sx: 0, sy: 378 },
  'storm-band-84': { x: -20, y: 67, width: 430, height: 38, sx: 0, sy: 417 },
  'storm-band-54': { x: -20, y: 38, width: 430, height: 36, sx: 0, sy: 456 },
  'storm-drift-1': { x: 21, y: 252, width: 128, height: 82, sx: 181, sy: 250 },
  'storm-drift-2': { x: 240, y: 366, width: 145, height: 93, sx: 228, sy: 137 },
  'storm-drift-3': { x: -18, y: 435, width: 93, height: 60, sx: 310, sy: 250 },
  'storm-cloud': { x: 118, y: 171, width: 213, height: 136, sx: 0, sy: 0 },
  'storm-bolt': { x: 221, y: 278, width: 55, height: 112, sx: 0, sy: 137 },
  'storm-band-612': { x: -20, y: 598, width: 430, height: 30, sx: 0, sy: 808 },
  'storm-band-634': { x: -20, y: 622, width: 430, height: 27, sx: 0, sy: 901 },
  'lush-band-120': { x: -20, y: 104, width: 430, height: 36, sx: 0, sy: 493 },
  'lush-band-94': { x: -20, y: 78, width: 430, height: 36, sx: 0, sy: 530 },
  'lush-band-520': { x: -20, y: 503, width: 430, height: 36, sx: 0, sy: 567 },
  'lush-band-560': { x: -20, y: 544, width: 430, height: 34, sx: 0, sy: 639 },
  'lush-band-596': { x: -20, y: 581, width: 430, height: 32, sx: 0, sy: 742 },
  'lush-band-630': { x: -20, y: 618, width: 430, height: 27, sx: 0, sy: 929 },
  'sky-drift-1': { x: -16, y: 106, width: 171, height: 110, sx: 56, sy: 137 },
  'sky-drift-2': { x: 215, y: 199, width: 137, height: 88, sx: 0, sy: 250 },
  'sky-band-540': { x: -20, y: 524, width: 430, height: 34, sx: 0, sy: 674 },
  'sky-band-572': { x: -20, y: 557, width: 430, height: 32, sx: 0, sy: 775 },
  'sky-band-602': { x: -20, y: 588, width: 430, height: 30, sx: 0, sy: 839 },
  'sky-band-632': { x: -20, y: 620, width: 430, height: 27, sx: 0, sy: 957 },
  'umbrella-band-590': { x: -20, y: 576, width: 430, height: 30, sx: 0, sy: 870 },
} satisfies Record<string, ShadowCell>;

export type ShadowKey = keyof typeof SHADOW_CELLS;
