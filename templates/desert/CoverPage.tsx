import type { TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import { pickPhoto, uniquePhotos } from '../shared/pickPhotos';
import { sheetKeyForPhoto } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import styles from './desert.module.css';
import { Background } from './background';
import { SparkleSticker, Stamp } from './decor';
import { COVER_LAYOUT } from './layouts';
import { tapes, theme } from './theme';

/** Cover: who made it, the Poppins title over the moonlit dunes, dates, three polaroids. */
export function CoverPage({ trip }: { trip: TripData }) {
  const pool = uniquePhotos([trip.cover, ...trip.places.map((place) => place.photo), ...trip.photos]);
  const used = new Set<string>();
  const main = pickPhoto(pool, 'any', used);
  const left = pickPhoto(pool, 'any', used);
  const right = pickPhoto(pool, 'any', used);
  const rotate = (key: keyof typeof COVER_LAYOUT) =>
    COVER_LAYOUT[key].rotate + jitter(trip.seed, `desert:cover-${key}`, 1.5);

  return (
    <Stage background={theme.colors.paper} label={trip.shortTitle}>
      <Background scene="dunes" seed={1} />
      <div className={styles.layer}>
        {/* The design's cover sticker cs = [1, 76, 5, 14]: the sparkle. */}
        <SparkleSticker x={76} y={5} size={14} />
        <div className={styles.block} style={{ left: '7%', top: '10%', width: '70%' }}>
          <p className={styles.kicker}>a Quest by @{trip.traveler.handle}</p>
        </div>
        {/* Title and dates flow together, so a long title pushes the dates down instead of under it. */}
        <div className={styles.block} style={{ left: '7%', top: '14.5%', width: '88%' }}>
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

        {trip.destination && <Stamp x={68} y={80} width={26} big="☾" small={trip.destination} />}
      </div>
    </Stage>
  );
}
