import type { CSSProperties, ReactNode } from 'react';
import type { TripData } from '@/lib/trip/types';
import type { Theme } from '../types';
import { shownLink } from './exportLink';
import { toQuestPages, type QuestPage } from './pages';
import styles from './scrapbook.module.css';

// Instagram images (spec B §3.7): one story (1080 × 1920) and a carousel (1080 × 1350 each). Each
// image is the Quest's own page (the same cover and photo pages people see on onquest.in, so
// nothing is lost in export, Swati 21 Nov), centred on the template's paper, with the Quest's link
// as small text underneath. Pure: the export screen renders these off-screen and saves each as a JPEG.

export const STORY_SIZE = { width: 1080, height: 1920 };
export const CAROUSEL_SIZE = { width: 1080, height: 1350 };
const MAX_CAROUSEL_SLIDES = 20; // Instagram's limit

// Where the 9:14 page sits. Story: inside Instagram's safe area. Carousel: full height but for a
// thin strip at the bottom for the link.
const STORY_PAGE = { width: 920, top: 200 };
const CAROUSEL_PAGE = { width: 810, top: 22 };

type PhotoPageData = Extract<QuestPage, { kind: 'photos' }>;

export type FrameLook = {
  theme: Theme;
  /** The template's cover page and photo page: the export draws exactly what the Quest shows. */
  Cover: (props: { trip: TripData }) => ReactNode;
  Page: (props: { trip: TripData; page: PhotoPageData; pageNumber: number }) => ReactNode;
};

const themeVariables = ({ colors }: Theme) =>
  ({
    '--paper': colors.paper,
    '--ink': colors.ink,
    '--accent': colors.accent,
    '--accent2': colors.accent2,
    '--sand': colors.sand,
    '--cream': colors.cream,
    '--sky': colors.sky,
  }) as CSSProperties;

function Frame({
  look,
  size,
  page,
  url,
  linkSize,
  children,
}: {
  look: FrameLook;
  size: { width: number; height: number };
  page: { width: number; top: number };
  url: string;
  linkSize: number;
  children: ReactNode;
}) {
  const pageHeight = Math.round((page.width * 14) / 9);
  return (
    <div
      className={look.theme.fontClassName}
      style={{
        ...themeVariables(look.theme),
        ...size,
        position: 'relative',
        overflow: 'hidden',
        background: look.theme.colors.paper,
        color: look.theme.colors.ink,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        className={styles.exportFit}
        style={{
          position: 'absolute',
          top: page.top,
          left: (size.width - page.width) / 2,
          width: page.width,
        }}
      >
        {children}
      </div>
      {/* The watermark: the link in small, quiet text under the page (as small as it can be and
          still be typed in, Swati 21 Nov). */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          top: page.top + pageHeight,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: linkSize,
          fontWeight: 600,
          opacity: 0.6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {shownLink(url)}
      </div>
    </div>
  );
}

/** The Instagram story: the Quest's cover page. */
export function StoryFrame({ trip, look }: { trip: TripData; look: FrameLook }) {
  return (
    <Frame look={look} size={STORY_SIZE} page={STORY_PAGE} url={trip.url} linkSize={24}>
      <look.Cover trip={trip} />
    </Frame>
  );
}

/** The carousel: the cover, then every photo page in order, up to Instagram's 20 slides. */
export function carouselFrames(trip: TripData, look: FrameLook): ReactNode[] {
  const slides = toQuestPages(trip)
    .map((page, pageNumber) => ({ page, pageNumber }))
    .filter(({ page }) => page.kind !== 'route')
    .slice(0, MAX_CAROUSEL_SLIDES);
  return slides.map(({ page, pageNumber }) => (
    <Frame
      key={page.kind === 'photos' ? `${page.dayIndex}-${page.part}` : 'cover'}
      look={look}
      size={CAROUSEL_SIZE}
      page={CAROUSEL_PAGE}
      url={trip.url}
      linkSize={20}
    >
      {page.kind === 'photos' ? (
        <look.Page trip={trip} page={page} pageNumber={pageNumber} />
      ) : (
        <look.Cover trip={trip} />
      )}
    </Frame>
  ));
}
