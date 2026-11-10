import { escapeHtml } from './escape';
import type { EmailKind } from './links';

// The notification emails (spec B §3.5): plain and short. User text is escaped and cut.

export type NotificationEmail = {
  kind: EmailKind;
  questTitle?: string;
  /** Absolute URL of the Quest (like, comment) or the follower's profile (follow). */
  url: string;
  actorName?: string;
  commentBody?: string;
  unsubscribeUrl: string;
};

const cut = (text: string, length: number) => {
  const chars = [...text.replace(/\s+/g, ' ').trim()];
  return chars.length > length ? `${chars.slice(0, length - 1).join('')}…` : chars.join('');
};

export function buildNotificationEmail(email: NotificationEmail) {
  const title = cut(email.questTitle ?? 'your Quest', 60);
  const name = cut(email.actorName ?? 'Someone', 40);
  const subject =
    email.kind === 'like'
      ? `Someone liked your Quest ${title}`
      : email.kind === 'comment'
        ? `${name} commented on ${title}`
        : `${name} started following you on OnQuest`;
  const line =
    email.kind === 'comment' && email.commentBody
      ? `${name} commented on ${title}: "${cut(email.commentBody, 140)}"`
      : subject;
  const link = `${email.url}${email.url.includes('?') ? '&' : '?'}n=email`;
  const action = email.kind === 'follow' ? 'See their profile' : 'Open your Quest';
  const stop =
    email.kind === 'like'
      ? 'Stop emails about likes'
      : email.kind === 'comment'
        ? 'Stop emails about comments'
        : 'Stop emails about new followers';

  const html = [
    `<p>${escapeHtml(line)}</p>`,
    `<p><a href="${escapeHtml(link)}">${action}</a></p>`,
    `<p style="font-size:12px">You get this because of your OnQuest settings. ` +
      `<a href="${escapeHtml(email.unsubscribeUrl)}">${stop}</a></p>`,
  ].join('\n');
  const text = `${line}\n\n${action}: ${link}\n\n${stop}: ${email.unsubscribeUrl}\n`;
  return { subject, html, text };
}
