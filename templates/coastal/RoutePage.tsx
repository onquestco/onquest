import type { TripData } from '@/lib/trip/types';
import { layoutMap, MAP_HEIGHT, MAP_WIDTH } from '../shared/mapLayout';
import { placeKey } from '../shared/sheets';
import { Stage } from '../shared/Stage';
import shared from '../shared/scrapbook.module.css';
import { Background } from './background';
import styles from './coastal.module.css';
import { Shell } from './decor';
import { theme } from './theme';

/**
 * "Where I went" in the Coastal look: the design's red dashes and numbered pins on the sand, laid
 * out by the shared map layout so names never overlap. Only in the Quest when it has 2+ places.
 */
export function RoutePage({ trip }: { trip: TripData }) {
  if (trip.places.length < 2) return null;
  const pins = layoutMap(trip.places);
  const route = pins.map((pin) => `${pin.x},${pin.y}`).join(' ');
  const where = trip.destination ? `Map of ${trip.destination}` : 'Map';

  return (
    <Stage background={theme.colors.paper} label="Where I went">
      <Background variant="route" />
      <div className={styles.layer}>
        <div className={styles.block} style={{ left: '6%', top: '4%', width: '80%' }}>
          <p className={styles.kicker}>the route</p>
        </div>
        <div className={styles.block} style={{ left: '6%', top: '9%', width: '80%' }}>
          <h2 className={styles.pageTitle}>Where I went</h2>
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

        <Shell x={78} y={84} size={16} rotate={8} />
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
