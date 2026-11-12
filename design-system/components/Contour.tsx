// The brand's contour-line texture, like a trail map: behind sign-in and other welcome surfaces.
// Decorative only. Fills its positioned parent; put content above it with `relative`.

export function Contour() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full fill-none stroke-brand-tint"
    >
      <defs>
        <pattern id="oq-contour" width="240" height="240" patternUnits="userSpaceOnUse">
          <path d="M-10 40c40-20 70 20 110 0s70-30 150 10" strokeWidth={1.5} />
          <path d="M-10 80c50-25 80 25 120 5s60-35 140 0" strokeWidth={1.5} />
          <path d="M-10 130c30-15 60 30 100 10s80-40 160-5" strokeWidth={1.5} />
          <path d="M-10 180c45-30 85 20 125 0s70-25 135 10" strokeWidth={1.5} />
          <path d="M-10 225c40-15 75 20 115 5s75-30 145 5" strokeWidth={1.5} />
          <ellipse cx="170" cy="105" rx="28" ry="16" strokeWidth={1.5} />
          <ellipse cx="170" cy="105" rx="12" ry="7" strokeWidth={1.5} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#oq-contour)" stroke="none" />
    </svg>
  );
}
