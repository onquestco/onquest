// A small ring that fills as a photo uploads. Always paired with text for screen readers.

type Props = {
  /** 0 to 1. */
  progress: number;
  /** "Uploading photo 3 of 9", read instead of the drawing. */
  label: string;
  size?: number;
};

const STROKE = 3;

export function ProgressRing({ progress, label, size = 24 }: Props) {
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(1, Math.max(0, progress));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(filled * 100)}
      className="-rotate-90"
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={STROKE} className="stroke-surface" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - filled)}
        className="stroke-brand-strong transition-[stroke-dashoffset] motion-reduce:transition-none"
      />
    </svg>
  );
}
