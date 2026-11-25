// The app's few icons, drawn in currentColor so they take the text colour around them.
// An icon-only button must still carry an aria-label (README, Iconography).

type Props = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const HomeIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </svg>
);
export const ExploreIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </svg>
);
export const PlusIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const QuestsIcon = ({ size = 24 }: Props) => (
  // A map pin with a little mountain in it: the prototype's Quests tab.
  <svg {...base(size)}>
    <path d="M12 21.5 6.6 16a7.6 7.6 0 1 1 10.8 0L12 21.5Z" />
    <path d="m8.5 13 2.4-3.2 1.6 2 1.2-1.4 2 2.6" />
  </svg>
);
export const ProfileIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
export const BellIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />
  </svg>
);
export const HeartIcon = ({ size = 24, filled = false }: Props & { filled?: boolean }) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);
export const ExpandIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);
export const CloseIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const SettingsIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" />
  </svg>
);
export const MoreIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3} />
  </svg>
);
export const BackIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const ChevronIcon = ({ size = 18 }: Props) => (
  <svg {...base(size)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const PinIcon = ({ size = 14 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);
export const ShareIcon = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
);
export const ChatIcon = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 5h16v11H9l-5 4V5Z" />
  </svg>
);
export const PencilIcon = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
  </svg>
);
export const DownloadIcon = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
);
export const SearchIcon = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

// The blog editor's formatting toolbar (blogs-editor spec §6.1).
export const BoldIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)} strokeWidth={2.5}>
    <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
  </svg>
);
export const ItalicIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M10 5h8M6 19h8M14 5l-4 14" />
  </svg>
);
export const StrikethroughIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 12h16M16.5 7.5C16 6 14.4 5 12.2 5 9.6 5 8 6.3 8 8.2c0 1.4.9 2.4 2.6 3M8 16.5c.6 1.6 2.3 2.5 4.4 2.5 2.6 0 4.1-1.3 4.1-3.2 0-.6-.2-1.2-.5-1.6" />
  </svg>
);
export const CodeIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
  </svg>
);
/** "H" plus the level's digit. */
export const HeadingIcon = ({ size = 24, level }: Props & { level: 1 | 2 | 3 }) => (
  <svg {...base(size)}>
    <path d="M3 6v12M11 6v12M3 12h8" />
    {level === 1 && <path d="M16 10l2.5-2v10" />}
    {level === 2 && <path d="M15.5 10a2.5 2.5 0 0 1 5 0c0 2-5 4-5 8h5" />}
    {level === 3 && <path d="M15.5 8h5l-3 4a3 3 0 1 1-2 5" />}
  </svg>
);
export const BulletListIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </svg>
);
export const NumberedListIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)} strokeWidth={1.75}>
    <path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v4.5M3.5 14a1.5 1.5 0 0 1 3 0c0 1.2-3 2-3 4h3" />
  </svg>
);
export const QuoteIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M5 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6" />
  </svg>
);
export const LinkIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);
/** An eye with a line through it: hidden until tapped. */
export const SpoilerIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M3 3l18 18M10.6 6.1Q11.3 6 12 6c5 0 9 6 9 6a16 16 0 0 1-2.6 3.2M6.6 6.6C4.2 8.2 3 12 3 12s4 6 9 6c1.6 0 3-.4 4.3-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);
export const UndoIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />
  </svg>
);
export const RedoIcon = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />
  </svg>
);
