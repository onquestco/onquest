import { Contour } from '@/design-system/components/Contour';

/** The band behind the avatar: the brand's contour lines across the full width (the prototype). */
export function ProfileCover() {
  return (
    <div aria-hidden className="relative h-27.5 overflow-hidden border-b border-line bg-surface">
      <Contour />
    </div>
  );
}
