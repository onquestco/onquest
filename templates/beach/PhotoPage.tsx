import type { TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import type { QuestPage } from '../shared/pages';
import { dayKey } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import { OpenButton, Stamp, Strip, Text } from '../shared/Text';
import shared from '../shared/scrapbook.module.css';
import { tapes, theme } from './theme';

type Props = { trip: TripData; page: Extract<QuestPage, { kind: 'photos' }>; pageNumber: number };

/**
 * One Quest page: up to 3 photos, the page title and a place stamp. Layouts for 1, 2 and 3 photos;
 * nothing missing is drawn. Rotations keep the day's jitter keys, so a day's look is stable.
 */
export function PhotoPage({ trip, page, pageNumber }: Props) {
  const index = page.dayIndex;
  const day = trip.days[index];
  const [main, second, third] = page.photos;
  const background = theme.dayBackgrounds[(pageNumber - 1) % theme.dayBackgrounds.length];
  const number = String(pageNumber).padStart(2, '0');
  const lastPlace = page.places.at(-1)?.name;
  const keyPart = page.part === 1 ? `day-${index}` : `day-${index}-part-${page.part}`;
  const tilt = (key: string) => jitter(trip.seed, `${keyPart}-${key}`, 1.5);
  const opens = (photoIndex: number) => dayKey(index, page.firstPhotoIndex + photoIndex);
  const single = main && !second;

  return (
    <Stage background={background} label={page.title}>
      {page.dateLabel && (
        <Text x={6} y={4} width={88} role="script">
          {page.dateLabel}
        </Text>
      )}
      <Strip x={7} y={15.5} width={86} fontSize="4.6cqw">
        {page.title}
      </Strip>

      {main && (
        <Photo
          photo={main}
          frame="torn"
          x={single ? 10 : 7}
          y={single ? 30 : 27}
          width={single ? 80 : 72}
          aspect={0.95}
          rotate={-3 + tilt('a')}
          delay={0.1}
          label={single ? main.caption : undefined}
          opens={opens(0)}
        />
      )}
      {second && (
        <Photo
          photo={second}
          frame="polaroid"
          x={46}
          y={55}
          width={46}
          aspect={1}
          rotate={5 + tilt('b')}
          delay={0.3}
          label={second?.caption ?? page.places[0]?.name}
          tape={tapes[0]}
          opens={opens(1)}
        />
      )}
      {third && (
        <Photo
          photo={third}
          frame="polaroid"
          x={4}
          y={64}
          width={34}
          aspect={1}
          rotate={-6 + tilt('c')}
          delay={0.45}
          label={third?.caption}
          tape={tapes[2]}
          opens={opens(2)}
        />
      )}

      {lastPlace && <Stamp x={70} y={17.5} width={26} big={number} small={lastPlace} />}
      {page.part === 1 && (day?.quote || day?.story) && (
        <OpenButton opens={dayKey(index)}>read the day ➜</OpenButton>
      )}

      {/* Full text of the day for screen readers and search engines. */}
      <div className={shared.visuallyHidden}>
        <h3>{page.title}</h3>
        {page.photos.map((photo) => photo.caption && <p key={photo.id}>{photo.caption}</p>)}
        {page.part === 1 && day?.quote && <blockquote>{day.quote}</blockquote>}
        {page.part === 1 && day?.story && <p>{day.story}</p>}
      </div>
    </Stage>
  );
}
