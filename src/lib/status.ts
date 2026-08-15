/**
 * The status engine. Pure functions, no DOM, no React, no Date.now() hidden
 * inside — every entry point takes `now` explicitly so the server and the
 * client agree on what colour a cell is, and so this is testable.
 */

import type {
  Commitment,
  LiveCommitment,
  DistrictRollup,
  StateRollup,
  UrgencyBand,
  CommitmentStatus,
  Category,
} from './types';

/**
 * Fractions of the promised window at which a cell changes colour.
 * These are the whole product: at 0.55 of the way to a 3-month deadline the
 * cell turns yellow, which is early enough that somebody can still act.
 */
export const RAMP = {
  fresh: 0.55,
  soon: 0.8,
  urgent: 0.95,
} as const;

export interface BandStyle {
  /** Solid fill for mosaic cells. */
  fill: string;
  /** Text that stays readable on `fill`. */
  on: string;
  /** Tinted background for chips and cards in the page body. */
  soft: string;
  /** Text colour on `soft`. */
  softOn: string;
  border: string;
  label: string;
  /** One line a reader can act on. */
  meaning: string;
}

/**
 * The ramp is deliberately not the default Tailwind red/amber/green: those read
 * as a form-validation palette. These are warmer and slightly desaturated so a
 * wall of 60 cells is legible rather than a fairground.
 */
export const BAND_STYLE: Record<UrgencyBand, BandStyle> = {
  kept: {
    fill: 'var(--band-kept)',
    on: '#F2FBF6',
    soft: 'var(--band-kept-soft)',
    softOn: 'var(--band-kept-ink)',
    border: 'var(--band-kept)',
    label: 'Kept',
    meaning: 'Done, and citizens verified it.',
  },
  fresh: {
    fill: 'var(--band-fresh)',
    on: '#08301E',
    soft: 'var(--band-fresh-soft)',
    softOn: 'var(--band-fresh-ink)',
    border: 'var(--band-fresh)',
    label: 'On the clock',
    meaning: 'Plenty of the promised window still left.',
  },
  soon: {
    fill: 'var(--band-soon)',
    on: '#3A2A05',
    soft: 'var(--band-soon-soft)',
    softOn: 'var(--band-soon-ink)',
    border: 'var(--band-soon)',
    label: 'Running down',
    meaning: 'More than half the window is gone. Ask for a status.',
  },
  urgent: {
    fill: 'var(--band-urgent)',
    on: '#3A1B03',
    soft: 'var(--band-urgent-soft)',
    softOn: 'var(--band-urgent-ink)',
    border: 'var(--band-urgent)',
    label: 'Almost due',
    meaning: 'The deadline is about to land. Go and look.',
  },
  critical: {
    fill: 'var(--band-critical)',
    on: '#FFF3EF',
    soft: 'var(--band-critical-soft)',
    softOn: 'var(--band-critical-ink)',
    border: 'var(--band-critical)',
    label: 'Final hours',
    meaning: 'Under 5% of the window left. Escalate now.',
  },
  broken: {
    fill: 'var(--band-broken)',
    on: '#FFF1F1',
    soft: 'var(--band-broken-soft)',
    softOn: 'var(--band-broken-ink)',
    border: 'var(--band-broken)',
    label: 'Broken',
    meaning: 'Deadline passed. The work was not done.',
  },
  disputed: {
    fill: 'var(--band-disputed)',
    on: '#F5F0FF',
    soft: 'var(--band-disputed-soft)',
    softOn: 'var(--band-disputed-ink)',
    border: 'var(--band-disputed)',
    label: 'Disputed',
    meaning: 'Officials say done. Evidence on the ground says otherwise.',
  },
  undated: {
    fill: 'var(--band-undated)',
    on: '#12261B',
    soft: 'var(--band-undated-soft)',
    softOn: 'var(--band-undated-ink)',
    border: 'var(--band-undated)',
    label: 'No deadline',
    meaning: 'Accepted, but no date was ever given. Demand one.',
  },
  unanswered: {
    fill: 'var(--band-unanswered)',
    on: '#1C1B17',
    soft: 'var(--band-unanswered-soft)',
    softOn: 'var(--band-unanswered-ink)',
    border: 'var(--band-unanswered)',
    label: 'Unanswered',
    meaning: 'Raised in public. No official has responded.',
  },
};

/**
 * Texture class for a band, on top of its fill.
 *
 * Two bands earn one. `kept` is hatched so a finished promise never reads as
 * just another green cell, and `unanswered` is dotted because it sits next to
 * `undated` in the neutral range and hue alone did not separate them at tile
 * size. Texture also carries the distinction into greyscale and for readers
 * with colour vision deficiency, which colour alone cannot.
 */
export function bandTexture(band: UrgencyBand): string {
  if (band === 'kept') return 'hatch-kept';
  if (band === 'unanswered') return 'hatch-unanswered';
  return '';
}

/** Ranking used to decide which band a parent cell inherits. Worst wins. */
const SEVERITY: Record<UrgencyBand, number> = {
  kept: 0,
  undated: 1,
  fresh: 2,
  unanswered: 3,
  soon: 4,
  urgent: 5,
  disputed: 6,
  critical: 7,
  broken: 8,
};

export function worstBand(bands: UrgencyBand[]): UrgencyBand {
  if (bands.length === 0) return 'undated';
  return bands.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a));
}

/**
 * How much of the promised window has been used up, 0-1.
 * Returns `null` for commitments that were never given a date — those cannot
 * have a ramp, which is exactly why an undated promise is its own failure mode.
 */
export function elapsedFraction(c: Commitment, now: number): number | null {
  if (!c.deadline) return null;
  const start = Date.parse(c.promisedOn);
  const end = Date.parse(c.deadline);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return (now - start) / (end - start);
}

export function msRemaining(c: Commitment, now: number): number | null {
  if (!c.deadline) return null;
  return Date.parse(c.deadline) - now;
}

/**
 * The single decision this whole product turns on.
 *
 * Terminal states (fulfilled, disputed, unanswered) win outright: a promise
 * that was kept does not go red because time passed. Everything else is the
 * green->red ramp over the window that was actually promised, which is why a
 * 48-hour road promise reddens 45x faster than a 3-month building promise.
 */
export function bandFor(c: Commitment, now: number): UrgencyBand {
  if (c.status === 'fulfilled') return 'kept';
  if (c.status === 'disputed') return 'disputed';
  if (c.status === 'unanswered') return 'unanswered';
  if (!c.deadline) return 'undated';

  const remaining = msRemaining(c, now);
  if (remaining !== null && remaining <= 0) return 'broken';

  const e = elapsedFraction(c, now);
  if (e === null) return 'undated';
  if (e < RAMP.fresh) return 'fresh';
  if (e < RAMP.soon) return 'soon';
  if (e < RAMP.urgent) return 'urgent';
  return 'critical';
}

export function toLive(
  c: Commitment,
  now: number,
  counts: {
    proofs?: number;
    complaints?: number;
    receipts?: number;
    signedReceipts?: number;
  } = {},
): LiveCommitment {
  return {
    ...c,
    band: bandFor(c, now),
    msRemaining: msRemaining(c, now),
    elapsed: elapsedFraction(c, now),
    proofCount: counts.proofs ?? 0,
    complaintCount: counts.complaints ?? 0,
    receiptCount: counts.receipts ?? 0,
    signedReceiptCount: counts.signedReceipts ?? 0,
  };
}

/** Most urgent first, so the top of any list is the thing about to burn. */
export function byUrgency(a: LiveCommitment, b: LiveCommitment): number {
  const s = SEVERITY[b.band] - SEVERITY[a.band];
  if (s !== 0) return s;
  // Within a band, the nearest deadline is the more pressing one.
  if (a.msRemaining === null) return b.msRemaining === null ? 0 : 1;
  if (b.msRemaining === null) return -1;
  return a.msRemaining - b.msRemaining;
}

function countKept(cs: LiveCommitment[]) {
  return cs.filter((c) => c.status === 'fulfilled').length;
}
function countBroken(cs: LiveCommitment[]) {
  return cs.filter((c) => c.band === 'broken').length;
}

export function rollUp(commitments: Commitment[], now: number): StateRollup[] {
  const live = commitments.map((c) => toLive(c, now));
  const states = new Map<string, LiveCommitment[]>();

  for (const c of live) {
    const bucket = states.get(c.stateSlug);
    if (bucket) bucket.push(c);
    else states.set(c.stateSlug, [c]);
  }

  const out: StateRollup[] = [];
  for (const [slug, cs] of states) {
    const districts = new Map<string, LiveCommitment[]>();
    for (const c of cs) {
      // State-wide commitments get their own pseudo-district so they are never
      // invisible just because they do not belong to one place.
      const key = c.districtSlug ?? '_statewide';
      const bucket = districts.get(key);
      if (bucket) bucket.push(c);
      else districts.set(key, [c]);
    }

    const districtRollups: DistrictRollup[] = [...districts].map(([dslug, dcs]) => ({
      name: dcs[0].district ?? 'State-wide',
      slug: dslug,
      stateSlug: slug,
      commitments: [...dcs].sort(byUrgency),
      weight: dcs.reduce((sum, c) => sum + c.weight, 0),
      band: worstBand(dcs.map((c) => c.band)),
      kept: countKept(dcs),
      broken: countBroken(dcs),
      live: dcs.length,
    }));

    districtRollups.sort((a, b) => b.weight - a.weight);

    out.push({
      name: cs[0].state,
      slug,
      districts: districtRollups,
      commitments: [...cs].sort(byUrgency),
      weight: cs.reduce((sum, c) => sum + c.weight, 0),
      band: worstBand(cs.map((c) => c.band)),
      kept: countKept(cs),
      broken: countBroken(cs),
      live: cs.length,
    });
  }

  out.sort((a, b) => b.weight - a.weight);
  return out;
}

export interface Scorecard {
  total: number;
  kept: number;
  broken: number;
  running: number;
  undated: number;
  unanswered: number;
  disputed: number;
  /** Share of *decided* promises that were kept. Undecided ones are excluded. */
  keptRate: number;
  dueIn48h: number;
}

export function scorecard(live: LiveCommitment[]): Scorecard {
  const kept = live.filter((c) => c.band === 'kept').length;
  const broken = live.filter((c) => c.band === 'broken').length;
  const disputed = live.filter((c) => c.band === 'disputed').length;
  const undated = live.filter((c) => c.band === 'undated').length;
  const unanswered = live.filter((c) => c.band === 'unanswered').length;
  const running = live.length - kept - broken - disputed - undated - unanswered;
  const decided = kept + broken + disputed;

  return {
    total: live.length,
    kept,
    broken,
    running,
    undated,
    unanswered,
    disputed,
    keptRate: decided === 0 ? 0 : kept / decided,
    dueIn48h: live.filter(
      (c) => c.msRemaining !== null && c.msRemaining > 0 && c.msRemaining < 48 * 3600_000,
    ).length,
  };
}

export const CATEGORY_LABEL: Record<Category, string> = {
  education: 'Education',
  infrastructure: 'Infrastructure',
  water: 'Water & sanitation',
  health: 'Health',
  safety: 'Safety',
  jobs: 'Jobs & exams',
  governance: 'Governance',
};

export const STATUS_LABEL: Record<CommitmentStatus, string> = {
  unanswered: 'No official response',
  promised: 'Accepted, not started',
  in_progress: 'Work started',
  fulfilled: 'Completed & verified',
  broken: 'Deadline missed',
  disputed: 'Disputed',
};
