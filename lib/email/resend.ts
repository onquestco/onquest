// Sends one email through Resend's HTTP API (no SDK: one call, one dependency fewer).

export const NOTIFY_FROM = 'OnQuest <notifications@onquest.in>';

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
};

export async function sendWithResend(
  email: OutgoingEmail,
  {
    apiKey = process.env.RESEND_API_KEY,
    fetchImpl = fetch,
  }: { apiKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<'sent' | 'not_configured' | 'failed'> {
  if (!apiKey) return 'not_configured';
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        // One-click unsubscribe in mail apps (RFC 8058).
        headers: {
          'List-Unsubscribe': `<${email.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
