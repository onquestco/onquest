/** The first character of a title, by code point, so an emoji or a Devanagari letter stays whole. */
export function firstLetter(title: string): string {
  const [first] = [...title.trim()];
  return first ? first.toLocaleUpperCase('en-IN') : '·';
}

/**
 * A blog with no photos (PRD edge case "text only"): a plain tile with the title's first letter,
 * so lists never show an empty image box. Same size as the cover thumbnail it stands in for.
 */
export function LetterTile({ title }: { title: string }) {
  return (
    <span
      aria-hidden
      className="flex size-19 shrink-0 items-center justify-center rounded-md bg-brand-wash text-title text-brand-strong"
    >
      {firstLetter(title)}
    </span>
  );
}
