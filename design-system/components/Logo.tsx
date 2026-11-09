// The OnQuest logo, from the design system's logo files in public/brand/. Never retype "OnQuest"
// in a font to stand in for it, and never recolour or stretch it.

type Variant = 'on-light' | 'on-dark' | 'mark';

const files: Record<Variant, { src: string; ratio: number }> = {
  'on-light': { src: '/brand/onquest-logo-on-light.svg', ratio: 1310.5 / 389.75 },
  'on-dark': { src: '/brand/onquest-logo-on-dark.svg', ratio: 1429.25 / 424.25 },
  mark: { src: '/brand/onquest-mark.svg', ratio: 354.25 / 424 },
};

type Props = {
  variant?: Variant;
  /** Pixels. The full logo is at least 24 tall, the mark at least 16; the app header uses 28. */
  height?: number;
  className?: string;
};

export function Logo({ variant = 'on-light', height = 28, className }: Props) {
  const { src, ratio } = files[variant];
  return (
    <img src={src} alt="OnQuest" height={height} width={Math.round(height * ratio)} className={className} />
  );
}
