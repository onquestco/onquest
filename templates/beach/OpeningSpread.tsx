import type { TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import { pickPhoto, uniquePhotos } from '../shared/pickPhotos';
import { placeKey, placeNameForPhoto, sheetKeyForPhoto } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import shared from '../shared/scrapbook.module.css';
import { Sticker, Stamp, Strip, Text } from '../shared/Text';
import { Airmail, Shell, Star, Swatch, Waves } from './decor';
import styles from './beach.module.css';
import { tapes } from './theme';

/** Cover card: title, short name, dates and a collage of the trip's best photos. */
function CoverCard({ trip }: { trip: TripData }) {
  // Cover first, then one photo per place, then everything else.
  const pool = uniquePhotos([trip.cover, ...trip.places.map((place) => place.photo), ...trip.photos]);
  const used = new Set<string>();
  const tall = pickPhoto(pool, 'tall', used);
  const round = pickPhoto(pool, 'any', used);
  const square = pickPhoto(pool, 'any', used);
  const wide = pickPhoto(pool, 'wide', used);
  const tilt = (key: string) => jitter(trip.seed, `cover-${key}`, 1.5);

  return (
    <Stage label={trip.shortTitle}>
      <Airmail style={{ left: '-4%', top: '1.5%', width: '56%', rotate: '-5deg', zIndex: 3 }} />

      {tall && (
        <Photo
          photo={tall}
          frame="torn"
          x={4}
          y={6}
          width={40}
          aspect={0.62}
          rotate={-3 + tilt('a')}
          delay={0.1}
          opens={sheetKeyForPhoto(trip, tall.id)}
          priority
        />
      )}
      {round && (
        <Photo
          photo={round}
          frame="circle"
          x={51}
          y={13}
          width={38}
          aspect={1}
          rotate={4 + tilt('b')}
          delay={0.25}
          opens={sheetKeyForPhoto(trip, round.id)}
        />
      )}
      {trip.destination && (
        <Stamp
          x={80}
          y={2}
          width={16}
          big="🌴"
          small={
            <>
              {trip.destination}
              {trip.country && (
                <>
                  <br />
                  {trip.country}
                </>
              )}
            </>
          }
        />
      )}

      <Strip x={43} y={39} width={54}>
        {trip.shortTitle}
      </Strip>
      {trip.dateLabel && (
        <Text x={46} y={46.2} width={50} role="type">
          <time dateTime={trip.startDate}>{trip.dateLabel}</time>
        </Text>
      )}
      <Swatch
        colors={['#2F7FD1', '#E8D9BD', '#C9A77C', '#E8452F']}
        style={{ left: '46%', top: '50%', width: '50%' }}
      />

      {square && (
        <Photo
          photo={square}
          frame="polaroid"
          x={4}
          y={53}
          width={37}
          aspect={0.95}
          rotate={-5 + tilt('c')}
          delay={0.4}
          label={placeNameForPhoto(trip, square.id)}
          tape={tapes[2]}
          opens={sheetKeyForPhoto(trip, square.id)}
        />
      )}
      {wide && (
        <Photo
          photo={wide}
          frame="torn"
          x={41}
          y={62}
          width={55}
          aspect={1.45}
          rotate={3 + tilt('d')}
          delay={0.55}
          opens={sheetKeyForPhoto(trip, wide.id)}
        />
      )}

      <Text x={6} y={90} width={88} as="h1" style={{ margin: 0 }}>
        <span className={styles.title}>{trip.title}</span>
      </Text>

      <Sticker emoji="✈️" x={33} y={31} rotate={-8} />
      <Sticker emoji="🌺" x={79} y={54} rotate={10} />
      <Sticker emoji="🌼" x={86} y={78} rotate={-4} />
    </Stage>
  );
}

const FAVOURITE_SLOTS = [
  { x: 26, y: 11, width: 48, aspect: 1.25, rotate: -3 },
  { x: 5, y: 35, width: 42, aspect: 1.05, rotate: 4 },
  { x: 49, y: 53, width: 44, aspect: 1, rotate: -4 },
];

/** "Stayed with me": the traveler's top 3 places as polaroids. */
function FavouritesCard({ trip }: { trip: TripData }) {
  const favourites = trip.favourites.filter((place) => place.photo).slice(0, FAVOURITE_SLOTS.length);
  if (favourites.length === 0) return null;

  return (
    <Stage label="Places that stayed with me" background="linear-gradient(#EADFC8, #E2D1B0)">
      <Text x={0} y={3.5} width={100} as="h2" style={{ margin: 0 }}>
        <span className={styles.heading} style={{ display: 'block' }}>
          STAYED WITH ME
        </span>
      </Text>
      <Star />
      <Shell />
      {favourites.map((place, i) => (
        <Photo
          key={place.id}
          photo={place.photo!}
          frame="polaroid"
          {...FAVOURITE_SLOTS[i]!}
          rotate={FAVOURITE_SLOTS[i]!.rotate + jitter(trip.seed, `fav-${i}`, 1.5)}
          delay={0.15 * i + 0.1}
          label={place.name}
          tape={tapes[i % tapes.length]}
          opens={placeKey(trip.places.findIndex((p) => p.id === place.id))}
        />
      ))}
      <Waves />
      {trip.statsLabel && (
        <Text x={0} y={91} width={100} role="hand" style={{ textAlign: 'center' }}>
          {trip.statsLabel}
        </Text>
      )}
    </Stage>
  );
}

export function OpeningSpread({ trip }: { trip: TripData }) {
  return (
    <section className={shared.spread} aria-label="Trip cover">
      <CoverCard trip={trip} />
      <FavouritesCard trip={trip} />
    </section>
  );
}
