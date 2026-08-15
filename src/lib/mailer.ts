import 'server-only';

import type { AlertConfig } from './alerts';

/**
 * Email delivery.
 *
 * One provider adapter behind one function, so the alert engine never knows or
 * cares how mail leaves. Resend is the default because it needs a single API
 * key and a verified domain; SMTP or SES can be added as another branch without
 * touching anything upstream.
 *
 * When no provider is configured this returns a clean "not sent" rather than
 * throwing. A missing key is a configuration state, not an error — the whole
 * system is designed to run indefinitely in dry-run.
 */

export interface SendResult {
  ok: boolean;
  /** Provider message id, when there is one. */
  id?: string;
  error?: string;
  /** True when nothing was actually transmitted. */
  skipped?: boolean;
}

export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(
  cfg: AlertConfig,
  to: string[],
  subject: string,
  body: string,
): Promise<SendResult> {
  if (to.length === 0) {
    return { ok: false, skipped: true, error: 'No recipients.' };
  }
  if (!cfg.enabled) {
    return { ok: false, skipped: true, error: 'Alerts are disabled (ALERTS_ENABLED).' };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, skipped: true, error: 'No mail provider configured.' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${cfg.fromName} <${cfg.fromAddress}>`,
        to,
        subject,
        // Plain text on purpose. These notices get forwarded into government
        // systems and printed; HTML mail survives neither well.
        text: body,
        ...(cfg.replyTo ? { reply_to: cfg.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Provider returned ${res.status}: ${await res.text()}` };
    }

    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed.' };
  }
}
