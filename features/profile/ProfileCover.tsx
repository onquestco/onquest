/** The cover band behind the avatar: soft contour lines, like a trail map (PRD screen 15). */
export function ProfileCover() {
  return (
    <div aria-hidden className="h-28 overflow-hidden rounded-lg bg-brand-wash">
      <svg
        viewBox="0 0 400 112"
        preserveAspectRatio="none"
        className="h-full w-full fill-none stroke-brand-tint"
      >
        <path d="M-10 92 C 60 60, 120 104, 190 74 S 320 30, 410 58" strokeWidth={2} />
        <path d="M-10 70 C 50 40, 130 84, 200 52 S 330 10, 410 36" strokeWidth={2} />
        <path d="M-10 48 C 70 20, 140 62, 210 32 S 340 -6, 410 16" strokeWidth={2} />
        <path d="M60 112 C 110 90, 170 112, 230 96 S 340 80, 410 92" strokeWidth={2} />
        <ellipse cx="300" cy="66" rx="34" ry="14" strokeWidth={2} />
        <ellipse cx="300" cy="66" rx="16" ry="6" strokeWidth={2} />
      </svg>
    </div>
  );
}
