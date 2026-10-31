import type { Day, TripData } from '@/lib/trip/types';
import { jitter } from '../shared/jitter';
import { Photo } from '../shared/Photo';
import { dayKey } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import { OpenButton, Stamp, Strip, Text } from '../shared/Text';
import shared from '../shared/scrapbook.module.css';
import { tapes, theme } from './theme';

type Props = { trip: TripData; day: Day; index: number };

/** One card in the "Day by day" rail: up to 3 photos, title strip and a place stamp. */
export function DayCard({ trip, day, index }: Props) {
  const [main, second, third] = day.photos;
  const background = theme.dayBackgrounds[index % theme.dayBackgrounds.length];
  const number = String(day.number).padStart(2, '0');
  const lastPlace = day.places.at(-1)?.name;
  const tilt = (key: string) => jitter(trip.seed, `day-${index}-${key}`, 1.5);

  return (
    <Stage background={background} label={`Day ${day.number}: ${day.title}`}>
      <Text x={6} y={3} width={60} role="script">
        Day {day.number}
      </Text>
      <Strip x={7} y={15.5} width={86} fontSize="4.6cqw">
        {day.title}
      </Strip>

      {main && (
        <Photo
          photo={main}
          frame="torn"
          x={7}
          y={27}
          width={72}
          aspect={0.95}
          rotate={-3 + tilt('a')}
          delay={0.1}
          opens={dayKey(index, 0)}
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
          label={day.places[0]?.name}
          tape={tapes[0]}
          opens={dayKey(index, 1)}
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
          tape={tapes[2]}
          opens={dayKey(index, 2)}
        />
      )}

      {/* A day without photos shows its words instead. */}
      {!main && (
        <Text x={8} y={30} width={84} role="hand" style={{ fontSize: '7cqw' }}>
          {day.quote && <p style={{ margin: '0 0 4cqw' }}>“{day.quote}”</p>}
          {day.story && <p style={{ margin: 0, fontSize: '5cqw', lineHeight: 1.3 }}>{day.story}</p>}
        </Text>
      )}

      {lastPlace && <Stamp x={70} y={17.5} width={26} big={number} small={lastPlace} />}
      <OpenButton opens={dayKey(index)}>read the day ➜</OpenButton>

      {/* Full text of the day for screen readers and search engines. */}
      <div className={shared.visuallyHidden}>
        <h3>
          Day {day.number}: {day.title}
        </h3>
        {day.quote && <blockquote>{day.quote}</blockquote>}
        {day.story && <p>{day.story}</p>}
      </div>
    </Stage>
  );
}
