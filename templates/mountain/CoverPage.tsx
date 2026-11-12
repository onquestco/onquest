import type { TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import { pickPhoto, uniquePhotos } from '../shared/pickPhotos';
import { sheetKeyForPhoto } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import { Stamp, Text } from '../shared/Text';
import { Compass, Contours, Ridge } from './decor';
import styles from './mountain.module.css';
import { tapes } from './theme';

/** Cover: who made it, the title in caps, dates, and three prints fanned over the ridge. */
export function CoverPage({ trip }: { trip: TripData }) {
  const pool = uniquePhotos([trip.cover, ...trip.places.map((place) => place.photo), ...trip.photos]);
  const used = new Set<string>();
  const main = pickPhoto(pool, 'any', used);
  const left = pickPhoto(pool, 'any', used);
  const right = pickPhoto(pool, 'any', used);
  const tilt = (key: string) => jitter(trip.seed, `mountain-cover-${key}`, 1.5);

  return (
    <Stage label={trip.shortTitle}>
      <Contours />
      <Text x={6} y={4} width={88}>
        <span className={styles.kicker}>a Quest by @{trip.traveler.handle}</span>
      </Text>
      <Text x={6} y={10} width={80} as="h1" style={{ margin: 0 }}>
        <span className={styles.title}>{trip.title}</span>
      </Text>
      {(trip.dateLabel || trip.statsLabel) && (
        <Text x={6} y={25} width={88}>
          <span className={styles.meta}>
            {trip.dateLabel && <time dateTime={trip.startDate}>{trip.dateLabel}</time>}
            {trip.dateLabel && trip.statsLabel && ' · '}
            {trip.statsLabel}
          </span>
        </Text>
      )}

      {right && (
        <Photo
          photo={right}
          frame="polaroid"
          x={52}
          y={42}
          width={44}
          aspect={1}
          rotate={8 + tilt('right')}
          delay={0.35}
          tape={tapes[1]}
          opens={sheetKeyForPhoto(trip, right.id)}
        />
      )}
      {left && (
        <Photo
          photo={left}
          frame="polaroid"
          x={3}
          y={45}
          width={44}
          aspect={1}
          rotate={-9 + tilt('left')}
          delay={0.25}
          tape={tapes[2]}
          opens={sheetKeyForPhoto(trip, left.id)}
        />
      )}
      {main && (
        <Photo
          photo={main}
          frame="polaroid"
          x={17}
          y={31}
          width={64}
          aspect={0.95}
          rotate={-2 + tilt('main')}
          delay={0.1}
          label={main.caption}
          tape={tapes[0]}
          opens={sheetKeyForPhoto(trip, main.id)}
          priority
        />
      )}

      {trip.destination && <Stamp x={70} y={80} width={24} big="▲" small={trip.destination} />}
      <Compass x={78} y={2} size={16} rotate={12} />
      <Ridge />
    </Stage>
  );
}
