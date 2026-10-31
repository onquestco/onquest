import type { TripData } from '@/lib/trip/types';
import { Photo } from '../shared/Photo';
import { ShareButtons } from '../shared/ShareButtons';
import { NOTE_KEY } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import { Sticker, Text } from '../shared/Text';
import shared from '../shared/scrapbook.module.css';
import { Blob, Leaf } from './decor';
import styles from './beach.module.css';

/** Closing card: "Hello, Goa.", the traveler, the closing note and share buttons. */
export function ClosingSpread({ trip }: { trip: TripData }) {
  const { avatar, name, handle } = trip.traveler;

  return (
    <section className={shared.spread} aria-label="Closing note">
      <Stage label="Closing note" background="var(--cream)">
        <Blob color="#7DD3E8" style={{ right: '-18%', top: '-10%', width: '70%' }} />
        <Blob color="#BDE9F4" style={{ left: '-22%', bottom: '-8%', width: '80%' }} />
        <Leaf />

        <Text x={8} y={8} z={6}>
          <p className={styles.hello}>
            {trip.destination ? (
              <>
                Hello,<span>{trip.destination}.</span>
              </>
            ) : (
              <>
                Until<span>next time.</span>
              </>
            )}
          </p>
        </Text>

        {avatar && (
          <Photo photo={avatar} frame="circle" x={60} y={30} width={30} aspect={1} rotate={5} delay={0.2} />
        )}
        <Text x={6} y={36} width={50}>
          <div className={styles.travelerName}>{name}</div>
          <div className={styles.tagline}>
            Made of memories,
            <br />
            miles, and moments
          </div>
        </Text>

        <Text x={7} y={51} width={86}>
          {trip.note ? (
            <button type="button" className={shared.postcard} data-opens={NOTE_KEY}>
              <span>
                <b>{trip.closingHeadline}</b>
                <small>tap to read the note</small>
              </span>
            </button>
          ) : (
            <div className={shared.postcard}>
              <span>
                <b>{trip.closingHeadline}</b>
              </span>
            </div>
          )}
        </Text>

        <Text x={7} y={74} width={86}>
          <ShareButtons title={trip.title} text={trip.shortTitle} />
        </Text>

        <Text x={7} y={93} width={86}>
          <a className={shared.ctaLink} href={`/?ref=${encodeURIComponent(handle)}`}>
            Create your own travel story
          </a>
        </Text>

        <Sticker emoji="☀️" x={75} y={4} rotate={8} />
        <Sticker emoji="🍉" x={78} y={86} rotate={-10} />
      </Stage>
    </section>
  );
}
