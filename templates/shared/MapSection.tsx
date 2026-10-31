import type { TripData } from '@/lib/trip/types';
import { layoutMap, MAP_HEIGHT, MAP_WIDTH } from './mapLayout';
import { placeKey } from './sheets';
import styles from './scrapbook.module.css';

/** "Where I went": paper map with a numbered pin per place, in visit order. */
export function MapSection({ trip }: { trip: TripData }) {
  if (trip.places.length === 0) return null;

  const pins = layoutMap(trip.places);
  const route = pins.map((pin) => `${pin.x},${pin.y}`).join(' ');
  const where = trip.destination ? `Map of ${trip.destination}` : 'Map';

  return (
    <section className={styles.mapSection} id="map" aria-labelledby="map-title">
      <h2 className={styles.sectionTitle} id="map-title">
        Where I went
      </h2>
      <p className={styles.hint}>tap a pin to open the memory</p>

      <div className={styles.mapFrame}>
        <svg
          className={styles.mapSvg}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="img"
          aria-label={`${where} with ${trip.places.length} stops in order`}
        >
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#FAF3DF" />
          <path
            d="M0 140q40-24 80 0t80 0M480 360q40-24 80 0t80 0M0 620q40-24 80 0t80 0"
            fill="none"
            stroke="var(--accent)"
            strokeOpacity=".2"
            strokeWidth="3"
          />
          <polyline
            points={route}
            fill="none"
            stroke="var(--accent2)"
            strokeWidth="4"
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
          {pins.map((pin, i) => {
            const name = trip.places[i]!.name;
            const { chip } = pin;
            const leaderX = chip.side === 'left' ? chip.x + chip.width : chip.x;
            return (
              <g
                key={trip.places[i]!.id}
                className={styles.pin}
                data-opens={placeKey(i)}
                tabIndex={0}
                role="button"
                aria-label={`${i + 1}. ${name}`}
              >
                <line x1={pin.x} y1={pin.y} x2={leaderX} y2={chip.y} stroke="var(--ink)" strokeWidth="1.4" />
                <circle className={styles.pinDot} cx={pin.x} cy={pin.y} r="7" />
                {i === 0 && (
                  <circle className={styles.pulse} cx={pin.x} cy={pin.y} r="7" fill="var(--accent2)" />
                )}
                <rect
                  className={styles.pinChip}
                  x={chip.x}
                  y={chip.y - 17}
                  width={chip.width}
                  height="34"
                  rx="17"
                />
                <text x={chip.x + 16} y={chip.y + 7}>
                  <tspan fontWeight="700">{i + 1}</tspan> {name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* The same places as text, for screen readers and search engines. */}
      <ol className={styles.visuallyHidden}>
        {trip.places.map((place) => (
          <li key={place.id}>
            <h3>{place.name}</h3>
            {place.note && <p>{place.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
