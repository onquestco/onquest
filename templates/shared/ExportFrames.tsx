import type { CSSProperties, ReactNode } from 'react';
import type { Photo, TripData } from '@/lib/trip/types';
import type { Theme } from '../types';
import { shownLink } from './exportLink';
import { jitter } from './jitter';
import { toQuestPages, type QuestPage } from './pages';

// Instagram images (spec B §3.7): one story (1080 × 1920) and a carousel (1080 × 1350 each): the
// cover, then up to 5 pages. Sizes in px, every image carries the Quest's link as text. Pure: the
// export screen renders these off-screen and turns each into a JPEG.

export const STORY_SIZE = { width: 1080, height: 1920 };
export const CAROUSEL_SIZE = { width: 1080, height: 1350 };
const MAX_CAROUSEL_PAGES = 5; // + the cover = 6 slides, the taxonomy's maximum

export type FrameLook = {
  theme: Theme;
  /** Tape colours, used in rotation on polaroids. */
  tapes: string[];
  /** Font for titles: the template's script or serif. */
  titleFont: 'script' | 'serif';
};

const themeVariables = ({ colors }: Theme) =>
  ({
    '--paper': colors.paper,
    '--ink': colors.ink,
    '--accent': colors.accent,
    '--accent2': colors.accent2,
  }) as CSSProperties;

function Frame({
  look,
  size,
  background,
  children,
}: {
  look: FrameLook;
  size: { width: number; height: number };
  background?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={look.theme.fontClassName}
      style={{
        ...themeVariables(look.theme),
        ...size,
        position: 'relative',
        overflow: 'hidden',
        background: background ?? look.theme.colors.paper,
        color: look.theme.colors.ink,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </div>
  );
}

function Polaroid({
  photo,
  left,
  top,
  width,
  height,
  rotate,
  tape,
}: {
  photo: Photo;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  tape?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        padding: '24px 24px 72px',
        background: '#fffdf8',
        boxShadow: '0 18px 40px rgba(0,0,0,.18)',
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {tape && (
        <span
          style={{
            position: 'absolute',
            top: -22,
            left: '50%',
            width: 180,
            height: 44,
            marginLeft: -90,
            background: tape,
            transform: 'rotate(-4deg)',
          }}
        />
      )}
      <img
        src={photo.display}
        alt=""
        crossOrigin="anonymous"
        style={{ display: 'block', width: '100%', height, objectFit: 'cover' }}
      />
    </div>
  );
}

function LinkFooter({ look, url, bottom }: { look: FrameLook; url: string; bottom: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          padding: '18px 36px',
          borderRadius: 999,
          background: look.theme.colors.ink,
          color: look.theme.colors.paper,
          fontSize: 36,
          fontWeight: 500,
          letterSpacing: 0.5,
        }}
      >
        {shownLink(url)}
      </span>
    </div>
  );
}

function Title({
  look,
  children,
  size,
  top,
}: {
  look: FrameLook;
  children: ReactNode;
  size: number;
  top: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 72,
        right: 72,
        top,
        textAlign: 'center',
        fontFamily: `var(--font-${look.titleFont})`,
        fontSize: size,
        lineHeight: 1.1,
        color: look.theme.colors.accent,
      }}
    >
      {children}
    </div>
  );
}

function Subtitle({ children, top }: { children: ReactNode; top: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 72,
        right: 72,
        top,
        textAlign: 'center',
        fontFamily: 'var(--font-type)',
        fontSize: 40,
      }}
    >
      {children}
    </div>
  );
}

const tilt = (trip: TripData, key: string) => jitter(trip.seed, `export-${key}`, 2);

/** The Instagram story: the cover photo, title, dates and the link. */
export function StoryFrame({ trip, look }: { trip: TripData; look: FrameLook }) {
  const cover = trip.cover ?? trip.photos[0];
  return (
    <Frame look={look} size={STORY_SIZE}>
      <Title look={look} size={104} top={150}>
        {trip.title}
      </Title>
      {trip.dateLabel && <Subtitle top={430}>{trip.dateLabel}</Subtitle>}
      {cover && (
        <Polaroid
          photo={cover}
          left={150}
          top={560}
          width={780}
          height={860}
          rotate={-3 + tilt(trip, 'story')}
          tape={look.tapes[0]}
        />
      )}
      <LinkFooter look={look} url={trip.url} bottom={150} />
    </Frame>
  );
}

function CoverSlide({ trip, look }: { trip: TripData; look: FrameLook }) {
  const cover = trip.cover ?? trip.photos[0];
  return (
    <Frame look={look} size={CAROUSEL_SIZE}>
      <Title look={look} size={92} top={70}>
        {trip.title}
      </Title>
      {trip.dateLabel && <Subtitle top={290}>{trip.dateLabel}</Subtitle>}
      {cover && (
        <Polaroid
          photo={cover}
          left={190}
          top={380}
          width={700}
          height={640}
          rotate={-3 + tilt(trip, 'cover')}
          tape={look.tapes[0]}
        />
      )}
      <LinkFooter look={look} url={trip.url} bottom={50} />
    </Frame>
  );
}

type PhotoSlidePage = Extract<QuestPage, { kind: 'photos' }>;

// Positions for 1, 2 and 3 photos on a 1080 × 1350 slide.
const LAYOUTS = [
  [{ left: 160, top: 300, width: 760, height: 760, rotate: -2 }],
  [
    { left: 70, top: 300, width: 560, height: 560, rotate: -4 },
    { left: 470, top: 560, width: 520, height: 460, rotate: 5 },
  ],
  [
    { left: 60, top: 280, width: 560, height: 480, rotate: -4 },
    { left: 560, top: 360, width: 450, height: 400, rotate: 5 },
    { left: 240, top: 760, width: 440, height: 300, rotate: -2 },
  ],
];

function PhotoSlide({
  trip,
  look,
  page,
  index,
}: {
  trip: TripData;
  look: FrameLook;
  page: PhotoSlidePage;
  index: number;
}) {
  const backgrounds = look.theme.dayBackgrounds;
  const layout = LAYOUTS[Math.min(page.photos.length, 3) - 1] ?? [];
  return (
    <Frame look={look} size={CAROUSEL_SIZE} background={backgrounds[index % backgrounds.length]}>
      {page.dateLabel && (
        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 60,
            fontFamily: 'var(--font-script)',
            fontSize: 48,
            color: look.theme.colors.accent,
          }}
        >
          {page.dateLabel}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          top: 140,
          padding: '14px 28px',
          background: look.theme.colors.cream,
          fontFamily: 'var(--font-type)',
          fontSize: 52,
        }}
      >
        {page.title}
      </div>
      {page.photos.slice(0, 3).map((photo, photoIndex) => {
        const spot = layout[photoIndex];
        return (
          spot && (
            <Polaroid
              key={photo.id}
              photo={photo}
              {...spot}
              rotate={spot.rotate + tilt(trip, `${index}-${photoIndex}`)}
              tape={look.tapes[photoIndex % look.tapes.length]}
            />
          )
        );
      })}
      <LinkFooter look={look} url={trip.url} bottom={50} />
    </Frame>
  );
}

/** The carousel: the cover, then the Quest's first 5 photo pages. */
export function carouselFrames(trip: TripData, look: FrameLook): ReactNode[] {
  const pages = toQuestPages(trip)
    .filter((page): page is PhotoSlidePage => page.kind === 'photos')
    .slice(0, MAX_CAROUSEL_PAGES);
  return [
    <CoverSlide key="cover" trip={trip} look={look} />,
    ...pages.map((page, index) => (
      <PhotoSlide key={`${page.dayIndex}-${page.part}`} trip={trip} look={look} page={page} index={index} />
    )),
  ];
}
