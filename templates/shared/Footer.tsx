import type { TripData } from '@/lib/trip/types';
import styles from './scrapbook.module.css';

const REPORT_EMAIL = 'report@onquest.in'; // TODO(founders): create this inbox before the friends test

/** Growth loop + profile link + report link, under every trip page. */
export function Footer({ trip }: { trip: TripData }) {
  const { handle, name, profileUrl } = trip.traveler;
  const reportSubject = encodeURIComponent(`Report: ${trip.url}`);

  return (
    <footer className={styles.footer}>
      <p className={styles.footerBrand}>Made with OnQuest</p>
      <p>
        <a href={`/?ref=${encodeURIComponent(handle)}`}>Make your own</a>
        {' · '}
        {profileUrl && (
          <>
            <a href={profileUrl} rel="author">
              More trips by {name}
            </a>
            {' · '}
          </>
        )}
        <a href={`mailto:${REPORT_EMAIL}?subject=${reportSubject}`}>Report</a>
      </p>
    </footer>
  );
}
