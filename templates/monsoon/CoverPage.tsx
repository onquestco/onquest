import type { TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import { pickPhoto, uniquePhotos } from '../shared/pickPhotos';
import { sheetKeyForPhoto } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import styles from './monsoon.module.css';
import { Background } from './background';
import { Stamp } from './decor';
import { COVER_SLOT } from './layouts';
import { tapes, theme } from './theme';

/**
 * Cover: who made it, the white title over the storm, dates, and one big polaroid. Unlike the other
 * templates, the design's Monsoon cover has no side polaroids and no sticker.
 */
export function CoverPage({ trip }: { trip: TripData }) {
  const pool = uniquePhotos([trip.cover, ...trip.places.map((place) => place.photo), ...trip.photos]);
  const main = pickPhoto(pool, 'any', new Set<string>());

  return (
    <Stage background={theme.colors.paper} label={trip.shortTitle}>
      <Background scene="storm" seed={1} light />
      <div className={`${styles.layer} ${styles.light}`}>
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

        {main && (
          <Photo
            photo={main}
            frame="polaroid"
            {...COVER_SLOT}
            rotate={COVER_SLOT.rotate + jitter(trip.seed, 'monsoon:cover-main', 1.5)}
            delay={0.1}
            label={trip.destination ? `Welcome to ${trip.destination}` : main.caption}
            tape={tapes[0]}
            opens={sheetKeyForPhoto(trip, main.id)}
            priority
          />
        )}

        {trip.destination && <Stamp x={70} y={88} width={24} big="☔" small={trip.destination} />}
      </div>
    </Stage>
  );
}
