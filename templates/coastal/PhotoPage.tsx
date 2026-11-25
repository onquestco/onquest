import type { TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import type { QuestPage } from '../shared/pages';
import { dayKey } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import { OpenButton } from '../shared/Text';
import shared from '../shared/scrapbook.module.css';
import { Background } from './background';
import styles from './coastal.module.css';
import { PageStickers, Stamp } from './decor';
import { PAGE_LAYOUTS } from './layouts';
import { tapes, theme } from './theme';

type Props = { trip: TripData; page: Extract<QuestPage, { kind: 'photos' }>; pageNumber: number };

/**
 * One Quest page in the Coastal look: polaroids on the beach, the sea coming in from the top on
 * every second page (with light text over the water) and from the bottom on the others.
 */
export function PhotoPage({ trip, page, pageNumber }: Props) {
  const index = page.dayIndex;
  const day = trip.days[index];
  // The design counts its day pages from 0; pageNumber counts the cover as 0.
  const pageIndex = pageNumber - 1;
  const seaOnTop = pageIndex % 2 === 1;
  const photos = page.photos.slice(0, 3);
  const slots = PAGE_LAYOUTS[Math.max(1, photos.length) as 1 | 2 | 3];
  // Pages without light text show their beach at 60% over the paper, as in the design.
  const background = seaOnTop
    ? theme.dayBackgrounds[pageIndex % theme.dayBackgrounds.length]
    : theme.colors.paper;
  const keyPart = page.part === 1 ? `coastal:day-${index}` : `coastal:day-${index}-part-${page.part}`;
  const lastPlace = page.places.at(-1)?.name;

  return (
    <Stage background={background} label={page.title}>
      <Background variant={seaOnTop ? 'top' : 'bottom'} light={seaOnTop} />
      <div className={`${styles.layer} ${seaOnTop ? styles.light : ''}`}>
        {page.dateLabel && (
          <div className={styles.block} style={{ left: '6%', top: '4%', width: '64%' }}>
            <p className={styles.kicker}>{page.dateLabel}</p>
          </div>
        )}
        <div className={styles.block} style={{ left: '6%', top: '9%', width: '64%' }}>
          <h2 className={styles.pageTitle}>{page.title}</h2>
        </div>
        {lastPlace && (
          <Stamp x={72} y={4} width={22} big={String(pageNumber).padStart(2, '0')} small={lastPlace} />
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
