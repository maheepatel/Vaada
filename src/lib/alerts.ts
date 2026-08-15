/**
 * Breach alerts.
 *
 * When a deadline passes with no verified proof, two notices go out: one to the
 * official who is answerable, and one to the people who logged or are following
 * the promise so they can go and demand an answer.
 *
 * SAFETY POSTURE — this matters more than the code.
 *
 * Sending email to named government officials is an outward-facing,
 * irreversible act done in the operator's name. So:
 *
 *   - Sending is OFF unless ALERTS_ENABLED === 'true'. The default is a
 *     dry run that composes everything and stores it, sending nothing.
 *   - Authority notices additionally require ALERTS_NOTIFY_AUTHORITIES === 'true'.
 *     Notifying watchers is comparatively harmless; writing to a minister is not,
 *     and the two should never be switched on by the same flag.
 *   - No address is ever guessed. An official with no verified `email` is
 *     skipped and the alert records why.
 *   - One notice per promise per kind, ever. Nothing here can turn into a
 *     repeating mailer, which would be harassment rather than accountability.
 *
 * Composition is pure and separate from delivery, so the wording can be read
 * and tested without anything being able to leave the building.
 */

import { bandFor, msRemaining } from './status';
import { formatDate, formatCount, roughDuration } from './format';
import type {
  AlertKind,
  AlertRecord,
  Commitment,
  Official,
  Proof,
  Watcher,
} from './types';

export interface AlertConfig {
  enabled: boolean;
  notifyAuthorities: boolean;
  /** Public base URL, so links in the email resolve. */
  siteUrl: string;
  /** From address. Must be a domain the operator actually controls. */
  fromAddress: string;
  /** Where replies and corrections go. */
  replyTo?: string;
  /** Name the notice is sent in. Never a person's name by default. */
  fromName: string;
}

export function alertConfigFromEnv(): AlertConfig {
  return {
    enabled: process.env.ALERTS_ENABLED === 'true',
    notifyAuthorities: process.env.ALERTS_NOTIFY_AUTHORITIES === 'true',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:5300',
    fromAddress: process.env.ALERTS_FROM ?? 'notices@example.invalid',
    replyTo: process.env.ALERTS_REPLY_TO,
    fromName: process.env.ALERTS_FROM_NAME ?? 'Vaada promise register',
  };
}

export interface Composed {
  subject: string;
  body: string;
}

const DIVIDER = '\n' + '='.repeat(58) + '\n';

/**
 * Notice to the official.
 *
 * Written as a factual request for a status update, not an accusation. Three
 * reasons: it is what the evidence actually supports, it is far more likely to
 * get a reply, and it is the difference between a public record and something
 * a lawyer sends a letter about. Every claim in it is one the register can show.
 */
export function composeAuthorityNotice(
  c: Commitment,
  official: Official,
  cfg: AlertConfig,
  proofs: Proof[],
): Composed {
  const url = `${cfg.siteUrl}/p/${c.slug}`;
  const overdueBy = c.deadline ? roughDuration(Date.now() - Date.parse(c.deadline)) : 'some time';
  const refuting = proofs.filter((p) => p.direction === 'refutes' && p.verdict !== 'rejected');

  const subject = `Deadline passed: ${c.title}, ${c.locality}`;

  const body = [
    `Dear ${official.name},`,
    '',
    `This is an automated notice from a public register of commitments made by`,
    `officials in India. It is a request for a status update, not an allegation.`,
    DIVIDER.trim(),
    `COMMITMENT   ${c.title}`,
    `PLACE        ${c.locality}${c.district ? `, ${c.district}` : ''}, ${c.state}`,
    `ACCEPTED ON  ${formatDate(c.promisedOn)}`,
    `WINDOW GIVEN ${c.deadlineLabel ? `"${c.deadlineLabel}"` : 'none stated'}`,
    `DUE          ${formatDate(c.deadline)}`,
    `OVERDUE BY   ${overdueBy}`,
    c.beneficiaries ? `PEOPLE       ${formatCount(c.beneficiaries)} affected` : '',
    `YOUR ROLE    ${official.role}${official.body ? `, ${official.body}` : ''}`,
    DIVIDER.trim(),
    '',
    `As of today this register holds no verified evidence that the work was`,
    `completed. That is a statement about the evidence available to us, not a`,
    `finding about you or your office.`,
    '',
    refuting.length > 0
      ? `${refuting.length} ${refuting.length === 1 ? 'resident has' : 'residents have'} submitted evidence indicating the work is not complete. The most recent says:\n\n  "${refuting[0].claim}"\n`
      : `No evidence either way has been submitted by residents.`,
    '',
    `If the work has been done, the fastest way to correct the record is to`,
    `reply to this message with a photograph, a completion certificate or an`,
    `inspection note. It will be published against this entry and the status`,
    `updated to completed.`,
    '',
    `If the work has not been done, a revised date will be recorded and shown`,
    `alongside the original.`,
    '',
    `The full public entry, including every source it rests on:`,
    `  ${url}`,
    '',
    `To correct anything in this notice, including these contact details:`,
    `  ${cfg.siteUrl}/complaints/new?commitment=${c.slug}`,
    '',
    `${cfg.fromName}`,
    cfg.replyTo ? `  Replies: ${cfg.replyTo}` : '',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { subject, body };
}

/** Notice to whoever logged or is following the promise. */
export function composeWatcherNotice(
  c: Commitment,
  cfg: AlertConfig,
  kind: AlertKind,
): Composed {
  const url = `${cfg.siteUrl}/p/${c.slug}`;
  const official = c.accountable[0];

  if (kind === 'due_soon') {
    const left = c.deadline ? roughDuration(Date.parse(c.deadline) - Date.now()) : 'soon';
    return {
      subject: `${left} left: ${c.title}`,
      body: [
        `A promise you are following is close to its deadline.`,
        '',
        `  ${c.title}`,
        `  ${c.locality}${c.district ? `, ${c.district}` : ''}, ${c.state}`,
        `  Due ${formatDate(c.deadline)}, ${left} left`,
        official ? `  Answerable: ${official.name}, ${official.role}` : '',
        '',
        `There is still time for this one to be kept. If you can get to the site,`,
        `a photograph taken now is the most useful thing on the record, whichever`,
        `way it goes.`,
        '',
        `  ${url}`,
        '',
        `${cfg.fromName}`,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  return {
    subject: `Deadline missed: ${c.title}`,
    body: [
      `A promise you logged has passed its deadline with no verified proof that`,
      `the work was done.`,
      '',
      `  ${c.title}`,
      `  ${c.locality}${c.district ? `, ${c.district}` : ''}, ${c.state}`,
      `  Promised ${formatDate(c.promisedOn)}${c.deadlineLabel ? `, "${c.deadlineLabel}"` : ''}`,
      `  Was due ${formatDate(c.deadline)}`,
      '',
      official
        ? `Answerable: ${official.name}, ${official.role}${official.body ? `, ${official.body}` : ''}${official.handle ? ` (${official.handle})` : ''}`
        : `No official has been recorded as answerable for this. That is worth fixing.`,
      '',
      cfg.notifyAuthorities && official?.email
        ? `A notice has also gone to ${official.name} asking for a status update.`
        : `No notice has gone to the official: ${
            official?.email
              ? 'authority notices are switched off on this deployment.'
              : 'we hold no verified contact address for them.'
          }`,
      '',
      `What actually moves this:`,
      `  · Send a photograph of the site as it is today.`,
      `  · Ask the office named above, in writing, for a status and a revised date.`,
      `  · Share the entry so more people are watching the same deadline.`,
      '',
      `  ${url}`,
      '',
      `${cfg.fromName}`,
      `  You are getting this because you logged or followed this promise.`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export interface BreachCandidate {
  commitment: Commitment;
  kind: AlertKind;
}

/**
 * Which promises need a notice right now.
 *
 * `alreadySent` is the set of `commitmentId:kind` pairs that have gone out
 * before. It is checked here rather than at send time so a dry run reports the
 * same result the real run would.
 */
export function findAlertable(
  commitments: Commitment[],
  now: number,
  alreadySent: Set<string>,
): BreachCandidate[] {
  const out: BreachCandidate[] = [];

  for (const c of commitments) {
    if (!c.deadline) continue;
    const remaining = msRemaining(c, now);
    if (remaining === null) continue;

    const band = bandFor(c, now);

    // Fired once the deadline has gone and the promise is not already settled.
    if (remaining <= 0 && band === 'broken') {
      if (!alreadySent.has(`${c.id}:breach`)) {
        out.push({ commitment: c, kind: 'breach' });
      }
      continue;
    }

    // A warning early enough to be actionable. Short-window promises get their
    // warning proportionally sooner, so a 48-hour promise is not warned about
    // 24 hours in when that is half its life.
    const window = Date.parse(c.deadline) - Date.parse(c.promisedOn);
    const leadTime = Math.min(86_400_000, window * 0.25);
    if (remaining > 0 && remaining <= leadTime && !alreadySent.has(`${c.id}:due_soon`)) {
      out.push({ commitment: c, kind: 'due_soon' });
    }
  }

  return out;
}

/** Everyone who should hear about this promise, de-duplicated by address. */
export function watchersFor(c: Commitment, extra: Watcher[] = []): Watcher[] {
  const all = [...(c.loggedBy ? [c.loggedBy] : []), ...extra];
  const seen = new Set<string>();
  return all.filter((w) => {
    const key = w.email.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Builds every alert row for one candidate without sending anything.
 * Delivery is the caller's job; this function cannot reach the network.
 */
export function planAlerts(
  candidate: BreachCandidate,
  cfg: AlertConfig,
  watchers: Watcher[],
  proofs: Proof[],
  now: number,
): Omit<AlertRecord, 'id'>[] {
  const { commitment: c, kind } = candidate;
  const plans: Omit<AlertRecord, 'id'>[] = [];
  const createdAt = new Date(now).toISOString();

  const watcherEmails = watchers.map((w) => w.email);
  if (watcherEmails.length > 0) {
    const { subject, body } = composeWatcherNotice(c, cfg, kind);
    plans.push({
      commitmentId: c.id,
      kind,
      audience: 'watchers',
      recipients: watcherEmails,
      subject,
      body,
      state: cfg.enabled ? 'queued' : 'dry_run',
      createdAt,
    });
  }

  // Authorities are only ever written to on an actual breach, never on a
  // warning. Chasing somebody before their own deadline has passed is not
  // accountability, and it is the fastest way to be dismissed as noise.
  if (kind === 'breach') {
    for (const official of c.accountable) {
      if (!official.email) {
        plans.push({
          commitmentId: c.id,
          kind,
          audience: 'authority',
          recipients: [],
          subject: `No contact on file: ${official.name}`,
          body: '',
          state: 'suppressed',
          note: `No verified email address is held for ${official.name} (${official.role}). Add one, with its source, before notices can be sent.`,
          createdAt,
        });
        continue;
      }

      const { subject, body } = composeAuthorityNotice(c, official, cfg, proofs);
      const allowed = cfg.enabled && cfg.notifyAuthorities;
      plans.push({
        commitmentId: c.id,
        kind,
        audience: 'authority',
        recipients: [official.email],
        subject,
        body,
        state: allowed ? 'queued' : 'dry_run',
        note: allowed
          ? undefined
          : 'Composed but not sent: authority notices are disabled on this deployment.',
        createdAt,
      });
    }
  }

  return plans;
}
