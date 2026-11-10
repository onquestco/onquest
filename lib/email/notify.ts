import { buildNotificationEmail } from './content';
import { unsubscribeUrl, type EmailKind } from './links';
import type { OutgoingEmail } from './resend';

// One email per like and per comment, straight after the bell item is written (spec B §3.5),
// if the recipient's switch is on and today's budget has room. Never throws: the like or
// comment has already succeeded.

const SWITCH: Record<EmailKind, 'emailOnLike' | 'emailOnComment' | 'emailOnFollow'> = {
  like: 'emailOnLike',
  comment: 'emailOnComment',
  follow: 'emailOnFollow',
};

export type NotifyEvent = {
  kind: EmailKind;
  recipientKey: string;
  /** Never used for likes: the creator doesn't learn who liked. */
  actorKey?: string;
  tripKey?: string;
  commentBody?: string;
};

export type NotifyDeps = {
  recipient: (key: string) => Promise<{ email: string; settings: Record<string, unknown> } | null>;
  quest: (tripKey: string) => Promise<{ title: string; url: string } | null>;
  person: (key: string) => Promise<{ name: string; url: string } | null>;
  claimBudget: (kind: EmailKind) => Promise<boolean>;
  overBudget: () => void;
  send: (email: OutgoingEmail) => Promise<'sent' | 'not_configured' | 'failed'>;
};

export type NotifyOutcome =
  'sent' | 'switched_off' | 'no_recipient' | 'over_budget' | 'not_configured' | 'failed';

export async function notifyByEmail(event: NotifyEvent, deps: NotifyDeps): Promise<NotifyOutcome> {
  try {
    const recipient = await deps.recipient(event.recipientKey);
    if (!recipient) return 'no_recipient';
    if (recipient.settings[SWITCH[event.kind]] === false) return 'switched_off';

    const quest = event.tripKey ? await deps.quest(event.tripKey) : null;
    const actor = event.kind !== 'like' && event.actorKey ? await deps.person(event.actorKey) : null;
    const url = event.kind === 'follow' ? actor?.url : quest?.url;
    if (!url) return 'failed';

    if (!(await deps.claimBudget(event.kind))) {
      deps.overBudget();
      return 'over_budget';
    }
    const stop = unsubscribeUrl(event.recipientKey, event.kind);
    const content = buildNotificationEmail({
      kind: event.kind,
      questTitle: quest?.title,
      url,
      actorName: actor?.name,
      commentBody: event.commentBody,
      unsubscribeUrl: stop,
    });
    return await deps.send({ to: recipient.email, ...content, unsubscribeUrl: stop });
  } catch {
    return 'failed';
  }
}
