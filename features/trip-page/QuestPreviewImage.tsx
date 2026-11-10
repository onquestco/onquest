import { color } from '@/design-system/tokens';

// The link preview (WhatsApp, Instagram, iMessage): the cover as a tilted polaroid, the title and
// @handle (spec B §3.2). Drawn by next/og, which takes inline styles only, so colours come from
// the design system's raw values. 1200 × 630.

type Props = { title: string; handle: string; coverUrl: string | null; subtitle?: string };

export function QuestPreviewImage({ title, handle, coverUrl, subtitle }: Props) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 64,
        padding: '0 72px',
        background: color('brand-wash'),
        color: color('ink'),
      }}
    >
      {coverUrl && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 20px 64px',
            background: color('surface'),
            transform: 'rotate(-4deg)',
            boxShadow: `0 12px 32px ${color('line')}`,
          }}
        >
          <img src={coverUrl} alt="" width={400} height={440} style={{ objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 32, color: color('ink-muted') }}>{subtitle}</div>}
        <div style={{ display: 'flex', fontSize: 32, color: color('ink-muted') }}>@{handle}</div>
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: color('brand-strong') }}>
          OnQuest
        </div>
      </div>
    </div>
  );
}
