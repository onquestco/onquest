import type { TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import { pickPhoto, uniquePhotos } from '../shared/pickPhotos';
import { sheetKeyForPhoto } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import { Background } from './background';
import styles from './coastal.module.css';
import { Stamp, Sun } from './decor';
import { COVER_LAYOUT } from './layouts';
import { tapes } from './theme';

/** Cover: who made it, the title over the sea, dates, and three polaroids fanned on the sand. */
export function CoverPage({ trip }: { trip: TripData }) {
  const pool = uniquePhotos([trip.cover, ...trip.places.map((place) => place.photo), ...trip.photos]);
  const used = new Set<string>();
  const main = pickPhoto(pool, 'any', used);
  const left = pickPhoto(pool, 'any', used);
  const right = pickPhoto(pool, 'any', used);
  const rotate = (key: keyof typeof COVER_LAYOUT) =>
    COVER_LAYOUT[key].rotate + jitter(trip.seed, `coastal:cover-${key}`, 1.5);

  return (
    <Stage label={trip.shortTitle}>
      <Background variant="cover" light />
      <div className={`${styles.layer} ${styles.light}`}>
        <Sun x={76} y={2} size={18} rotate={12} />
        <div className={styles.block} style={{ left: '6%', top: '4%', width: '70%' }}>
          <p className={styles.kicker}>a Quest by @{trip.traveler.handle}</p>
        </div>
        {/* Title and dates flow together, so a long title pushes the dates down instead of under it. */}
        <div className={styles.block} style={{ left: '6%', top: '9%', width: '78%' }}>
          <h1 className={styles.title}>{trip.title}</h1>
          {(trip.dateLabel || trip.statsLabel) && (
            <p className={styles.meta}>
              {trip.dateLabel && <time dateTime={trip.startDate}>{trip.dateLabel}</time>}
              {trip.dateLabel && trip.statsLabel && ' · '}
              {trip.statsLabel}
            </p>
          )}
        </div>

        {right && (
          <Photo
            photo={right}
            frame="polaroid"
            {...COVER_LAYOUT.right}
            rotate={rotate('right')}
            delay={0.35}
            tape={tapes[1]}
            opens={sheetKeyForPhoto(trip, right.id)}
          />
        )}
        {left && (
          <Photo
            photo={left}
            frame="polaroid"
            {...COVER_LAYOUT.left}
            rotate={rotate('left')}
            delay={0.25}
            tape={tapes[2]}
            opens={sheetKeyForPhoto(trip, left.id)}
          />
        )}
        {main && (
          <Photo
            photo={main}
            frame="polaroid"
            {...COVER_LAYOUT.main}
            rotate={rotate('main')}
            delay={0.1}
            label={trip.destination ? `Welcome to ${trip.destination}` : main.caption}
            tape={tapes[0]}
            opens={sheetKeyForPhoto(trip, main.id)}
            priority
          />
        )}

        {trip.destination && <Stamp x={68} y={78} width={26} big="☀" small={trip.destination} />}
      </div>
    </Stage>
  );
}
