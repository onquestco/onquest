import type { TripData } from '@/lib/trip/types';
import { layoutMap, MAP_HEIGHT, MAP_WIDTH } from '../shared/mapLayout';
import { placeKey } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import shared from '../shared/scrapbook.module.css';
import styles from './alpine.module.css';
import { Background } from './background';
import { Compass } from './decor';
import { HEIGHT, WIDTH } from './scenery';
import { theme } from './theme';

// The design's faint topographic rings, in its 390 × 650 box: [cx, cy, rx, ry].
const CONTOURS = [
  [270, 150, 70, 38],
  [270, 150, 44, 23],
  [270, 150, 20, 10],
  [110, 300, 80, 40],
  [110, 300, 50, 25],
] as const;

/**
 * "Where I climbed" in the Mountain look: the design's rust dashes and numbered pins over contour
 * lines, laid out by the shared map layout so names never overlap. Only in the Quest with 2+ places.
 */
export function RoutePage({ trip }: { trip: TripData }) {
  if (trip.places.length < 2) return null;
  const pins = layoutMap(trip.places);
  const route = pins.map((pin) => `${pin.x},${pin.y}`).join(' ');
  const where = trip.destination ? `Map of ${trip.destination}` : 'Map';

  return (
    <Stage background={theme.colors.paper} label="Where I climbed">
      <Background scene="mist" seed={9} />
      <svg className={styles.contours} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden>
        <g fill="none" stroke="#5F7F63" strokeOpacity=".28" strokeWidth="1.3">
          {CONTOURS.map(([cx, cy, rx, ry]) => (
            <ellipse key={`${cx}-${rx}`} cx={cx} cy={cy} rx={rx} ry={ry} />
          ))}
        </g>
      </svg>
      <div className={styles.layer}>
        <div className={styles.block} style={{ left: '7%', top: '8%', width: '80%' }}>
          <p className={styles.kicker}>the trail</p>
        </div>
        <div className={styles.block} style={{ left: '7%', top: '12.5%', width: '80%' }}>
          <h2 className={styles.pageTitle}>Where I climbed</h2>
        </div>

        <svg
          className={styles.route}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="img"
          aria-label={`${where} with ${trip.places.length} stops in order`}
        >
          <polyline
            points={route}
            fill="none"
            stroke="var(--accent2)"
            strokeWidth="6"
            strokeDasharray="5 15"
            strokeLinecap="round"
          />
          {pins.map((pin, i) => {
            const place = trip.places[i];
            if (!place) return null;
            const { chip } = pin;
            const nearPin = chip.side === 'left' ? chip.x + chip.width : chip.x;
            return (
              <g
                key={place.id}
                className={styles.pin}
                data-opens={placeKey(i)}
                tabIndex={0}
                role="button"
                aria-label={`${i + 1}. ${place.name}`}
              >
                {/* A 44 px tap target on a phone, bigger than the pin itself. */}
                <circle cx={pin.x} cy={pin.y} r="52" fill="transparent" />
                <line
                  x1={pin.x}
                  y1={pin.y}
                  x2={nearPin}
                  y2={chip.y}
                  stroke="var(--ink)"
                  strokeOpacity=".35"
                  strokeWidth="2"
                />
                <circle cx={pin.x} cy={pin.y} r="18" fill="var(--accent2)" stroke="#fff" strokeWidth="6" />
                <text x={pin.x} y={pin.y + 7} textAnchor="middle" className={styles.pinNumber}>
                  {i + 1}
                </text>
                <text
                  x={nearPin}
                  y={chip.y + 8}
                  textAnchor={chip.side === 'left' ? 'end' : 'start'}
                  className={styles.pinName}
                >
                  {place.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* The design has the compass mid-page; here it sits below the map so it never covers a pin. */}
        <Compass x={80} y={72} size={15} rotate={10} />
      </div>

      {/* The same places as text, for screen readers and search engines. */}
      <ol className={shared.visuallyHidden}>
        {trip.places.map((place) => (
          <li key={place.id}>
            <h3>{place.name}</h3>
            {place.note && <p>{place.note}</p>}
          </li>
        ))}
      </ol>
    </Stage>
  );
}
