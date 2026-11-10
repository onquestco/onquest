import { placeholderImage, type Scene } from '@/lib/demo/placeholderImages';

// Three tilted sample photos, for the welcome steps and the Home banner.

const TILTS = ['-rotate-6', 'rotate-0 -translate-y-2', 'rotate-6'];

export function PhotoFan({ scenes }: { scenes: [Scene, Scene, Scene] }) {
  return (
    <div aria-hidden className="flex justify-center">
      {scenes.map((scene, index) => (
        <img
          key={scene}
          src={placeholderImage(scene, index + 1)}
          alt=""
          className={`-mx-2 aspect-4/5 w-24 rounded-sm border-4 border-surface object-cover ${TILTS[index]}`}
        />
      ))}
    </div>
  );
}
