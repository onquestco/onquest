// A person's photo, or their first initial on the brand tint when there's no photo.

type Props = { name: string; src?: string; size?: number };

export function Avatar({ name, src, size = 32 }: Props) {
  const style = { width: size, height: size };
  if (src) return <img src={src} alt="" width={size} height={size} style={style} className="rounded-pill object-cover" />;
  return (
    <span
      aria-hidden
      style={style}
      className="flex items-center justify-center rounded-pill bg-brand-tint text-label font-semibold text-ink"
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
