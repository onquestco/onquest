import type { TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import type { QuestPage } from '../shared/pages';
import { dayKey } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import { OpenButton } from '../shared/Text';
import shared from '../shared/scrapbook.module.css';
import styles from './monsoon.module.css';
import { Background, type Scene } from './background';
import { PageStickers, Stamp } from './decor';
import { PAGE_LAYOUTS } from './layouts';
import { tapes, theme } from './theme';

type Props = { trip: TripData; page: Extract<QuestPage, { kind: 'photos' }>; pageNumber: number };

// The design's photo pages cycle through three scenes; theme.dayBackgrounds holds their base colours
// in the same order.
const SCENES: Scene[] = ['lush', 'sky', 'umbrella'];

// The design's `light` kinds: white text on the dark scenes, ink on the bright ones.
const LIGHT: Scene[] = ['storm', 'lush'];

/** One Quest page in the Monsoon look: polaroids in green rain, under a bright sky or among umbrellas. */
export function PhotoPage({ trip, page, pageNumber }: Props) {
  const index = page.dayIndex;
  const day = trip.days[index];
  // The design counts its day pages from 0; pageNumber counts the cover as 0.
  const pageIndex = pageNumber - 1;
  const scene = SCENES[pageIndex % SCENES.length] ?? 'lush';
  const photos = page.photos.slice(0, 3);
  const slots = PAGE_LAYOUTS[Math.max(1, photos.length) as 1 | 2 | 3];
  const background = theme.dayBackgrounds[pageIndex % theme.dayBackgrounds.length];
  const keyPart = page.part === 1 ? `monsoon:day-${index}` : `monsoon:day-${index}-part-${page.part}`;
  const lastPlace = page.places.at(-1)?.name;

  return (
    <Stage background={background} label={page.title}>
      <Background scene={scene} seed={pageIndex + 2} />
      <div className={`${styles.layer} ${LIGHT.includes(scene) ? styles.light : ''}`}>
        {page.dateLabel && (
          <div className={styles.block} style={{ left: '6%', top: '8%', width: '64%' }}>
            <p className={styles.kicker}>{page.dateLabel}</p>
          </div>
        )}
        <div className={styles.block} style={{ left: '6%', top: '12.5%', width: '64%' }}>
          <h2 className={styles.pageTitle}>{page.title}</h2>
        </div>
        {lastPlace && (
          <Stamp x={72} y={7} width={22} big={String(pageNumber).padStart(2, '0')} small={lastPlace} />
        )}

        {photos.map((photo, photoIndex) => {
          const slot = slots[photoIndex];
          if (!slot) return null;
          return (
            <Photo
              key={photo.id}
              photo={photo}
              frame="polaroid"
              {...slot}
              rotate={slot.rotate + jitter(trip.seed, `${keyPart}-${photoIndex}`, 1.5)}
              delay={0.1 + photoIndex * 0.15}
              label={photo.caption}
              tape={tapes[photoIndex % tapes.length]}
              opens={dayKey(index, page.firstPhotoIndex + photoIndex)}
            />
          );
        })}

        <PageStickers pageIndex={pageIndex} />
        {page.part === 1 && (day?.quote || day?.story) && (
          <OpenButton opens={dayKey(index)}>read the day ➜</OpenButton>
        )}
      </div>

      {/* Full text of the page for screen readers and search engines. */}
      <div className={shared.visuallyHidden}>
        {page.photos.map((photo) => photo.caption && <p key={photo.id}>{photo.caption}</p>)}
        {page.part === 1 && day?.quote && <blockquote>{day.quote}</blockquote>}
        {page.part === 1 && day?.story && <p>{day.story}</p>}
      </div>
    </Stage>
  );
}
