/**
 * Rolling promises up by the person who owns them.
 *
 * This is the view that changes behaviour. A single broken promise is an
 * anecdote; the same name attached to nine of them, with a kept rate printed
 * next to it, is a record. Everything here is derived from the same rows the
 * map is drawn from — there is no separate editorial judgement about anybody.
 */

import { slugify } from './format';
import { byUrgency } from './status';
import type { LiveCommitment, Official, UrgencyBand } from './types';

/** Officials are identified by their name. Roles change; names are the key. */
export function officialSlug(o: Official | string): string {
  return slugify(typeof o === 'string' ? o : o.name);
}

export interface AuthorityRecord {
  slug: string;
  official: Official;
  /** Every role this name has appeared under, most recent first. */
  roles: string[];
  commitments: LiveCommitment[];
  kept: number;
  broken: number;
  running: number;
  undated: number;
  unanswered: number;
  disputed: number;
  /** Kept as a share of decided promises. `null` when nothing has been decided. */
  keptRate: number | null;
  /** Total people covered by everything this name is answerable for. */
  reach: number;
  /** Worst band across their promises — colours their row. */
  worst: UrgencyBand;
  /** True when we hold a verified contact address for breach notices. */
  contactable: boolean;
  /** Nearest live deadline in ms, for sorting "who is on the clock". */
  nextDeadlineMs: number | null;
}

const SEVERITY_ORDER: UrgencyBand[] = [
  'kept', 'undated', 'fresh', 'unanswered', 'soon', 'urgent', 'disputed',
  'critical', 'broken',
];

function worstOf(bands: UrgencyBand[]): UrgencyBand {
  let worst: UrgencyBand = 'kept';
  for (const b of bands) {
    if (SEVERITY_ORDER.indexOf(b) > SEVERITY_ORDER.indexOf(worst)) worst = b;
  }
  return worst;
}

/**
 * Builds one record per named official.
 *
 * A promise with three accountable names counts once against each of them.
 * That is deliberate: a District Education Officer and a state minister who
 * jointly accepted a demand are both answerable for it, and letting either
 * point at the other is exactly the failure mode this register exists to close.
 */
export function buildAuthorities(commitments: LiveCommitment[]): AuthorityRecord[] {
  const byName = new Map<string, { official: Official; roles: Set<string>; items: LiveCommitment[] }>();

  for (const c of commitments) {
    for (const o of c.accountable) {
      const key = officialSlug(o);
      const entry = byName.get(key);
      if (entry) {
        entry.roles.add(o.role);
        entry.items.push(c);
        // Prefer whichever record actually carries contact details.
        if (!entry.official.email && o.email) entry.official = o;
      } else {
        byName.set(key, {
          official: o,
          roles: new Set([o.role]),
          items: [c],
        });
      }
    }
  }

  const records: AuthorityRecord[] = [];

  for (const [slug, { official, roles, items }] of byName) {
    const kept = items.filter((c) => c.band === 'kept').length;
    const broken = items.filter((c) => c.band === 'broken').length;
    const disputed = items.filter((c) => c.band === 'disputed').length;
    const undated = items.filter((c) => c.band === 'undated').length;
    const unanswered = items.filter((c) => c.band === 'unanswered').length;
    const decided = kept + broken + disputed;

    const liveDeadlines = items
      .map((c) => c.msRemaining)
      .filter((ms): ms is number => ms !== null && ms > 0);

    records.push({
      slug,
      official,
      roles: [...roles],
      commitments: [...items].sort(byUrgency),
      kept,
      broken,
      running: items.length - kept - broken - disputed - undated - unanswered,
      undated,
      unanswered,
      disputed,
      keptRate: decided === 0 ? null : kept / decided,
      reach: items.reduce((s, c) => s + (c.beneficiaries ?? 0), 0),
      worst: worstOf(items.map((c) => c.band)),
      contactable: Boolean(official.email),
      nextDeadlineMs: liveDeadlines.length > 0 ? Math.min(...liveDeadlines) : null,
    });
  }

  // Most broken first, then most on the hook. This ordering is the point of
  // the page, so it is not configurable.
  records.sort(
    (a, b) =>
      b.broken - a.broken ||
      b.commitments.length - a.commitments.length ||
      b.reach - a.reach,
  );

  return records;
}

export function findAuthority(
  records: AuthorityRecord[],
  slug: string,
): AuthorityRecord | null {
  return records.find((r) => r.slug === slug) ?? null;
}
