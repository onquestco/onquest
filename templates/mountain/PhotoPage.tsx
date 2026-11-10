import type { TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import type { QuestPage } from '../shared/pages';
import { dayKey } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import { OpenButton, Stamp, Text } from '../shared/Text';
import shared from '../shared/scrapbook.module.css';
import { Contours, PageSticker } from './decor';
import styles from './mountain.module.css';
import { tapes, theme } from './theme';

type Props = { trip: TripData; page: Extract<QuestPage, { kind: 'photos' }>; pageNumber: number };

type Slot = { x: number; y: number; width: number; aspect: number; rotate: number };

// Positions in % of the Stage, one layout per photo count, so a page with 1 or 2 photos still
// fills the card instead of leaving a gap where the third would be.
const LAYOUTS: Record<1 | 2 | 3, Slot[]> = {
  1: [{ x: 9, y: 25, width: 82, aspect: 0.82, rotate: -2 }],
  2: [
    { x: 5, y: 23, width: 62, aspect: 0.95, rotate: -4 },
    { x: 36, y: 56, width: 58, aspect: 1.05, rotate: 5 },
  ],
  3: [
    { x: 4, y: 23, width: 58, aspect: 1, rotate: -4 },
    { x: 44, y: 38, width: 52, aspect: 0.95, rotate: 5 },
    { x: 8, y: 63, width: 46, aspect: 1.15, rotate: -2 },
  ],
};

/** One Quest page in the Mountain look: kraft-taped prints over contour lines, place stamp, page number. */
export function PhotoPage({ trip, page, pageNumber }: Props) {
  const index = page.dayIndex;
  const day = trip.days[index];
  const count = Math.min(page.photos.length, 3) as 1 | 2 | 3;
  const slots = LAYOUTS[count];
  const background = theme.dayBackgrounds[(pageNumber - 1) % theme.dayBackgrounds.length];
  const keyPart = page.part === 1 ? `mountain-day-${index}` : `mountain-day-${index}-part-${page.part}`;
  const lastPlace = page.places.at(-1)?.name;

  return (
    <Stage background={background} label={page.title}>
      <Contours />
      {page.dateLabel && (
        <Text x={6} y={4} width={64}>
          <span className={styles.kicker}>{page.dateLabel}</span>
        </Text>
      )}
      <Text x={6} y={10} width={64} as="h2" style={{ margin: 0 }}>
        <span className={styles.pageTitle}>{page.title}</span>
      </Text>
      {lastPlace && <Stamp x={72} y={4} width={22} big={String(pageNumber).padStart(2, '0')} small={lastPlace} />}

      {page.photos.slice(0, 3).map((photo, photoIndex) => {
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

      <PageSticker pageNumber={pageNumber} />
      {page.part === 1 && (day?.quote || day?.story) && <OpenButton opens={dayKey(index)}>read the day ➜</OpenButton>}
      <Text x={84} y={93} width={12}>
        <span className={styles.pageNumber}>{pageNumber}</span>
      </Text>

      {/* Full text of the page for screen readers and search engines. */}
      <div className={shared.visuallyHidden}>
        {page.photos.map((photo) => photo.caption && <p key={photo.id}>{photo.caption}</p>)}
        {page.part === 1 && day?.quote && <blockquote>{day.quote}</blockquote>}
        {page.part === 1 && day?.story && <p>{day.story}</p>}
      </div>
    </Stage>
  );
}
