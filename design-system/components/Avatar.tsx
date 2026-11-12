// A person's photo, or their first initial on a colour picked from their name (the prototype's
// letter avatars), so the same person always gets the same colour.

type Props = { name: string; src?: string; size?: number };

const BACKGROUNDS = ['bg-avatar-1', 'bg-avatar-2', 'bg-avatar-3', 'bg-avatar-4', 'bg-avatar-5'];

function backgroundFor(name: string): string {
  let sum = 0;
  for (const character of name) sum = (sum * 31 + (character.codePointAt(0) ?? 0)) % 9973;
  return BACKGROUNDS[sum % BACKGROUNDS.length] ?? 'bg-avatar-5';
}

export function Avatar({ name, src, size = 32 }: Props) {
  const style = { width: size, height: size };
  if (src)
    return (
      <img src={src} alt="" width={size} height={size} style={style} className="rounded-pill object-cover" />
    );
  return (
    <span
      aria-hidden
      // The initial grows with the circle: a fixed text size looks lost in a profile-sized avatar.
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={`flex shrink-0 items-center justify-center rounded-pill leading-none font-bold text-on-brand ${backgroundFor(name)}`}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
