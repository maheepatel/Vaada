/**
 * League tables for states and districts.
 *
 * A ranking is a strong claim, so this file is mostly about not overclaiming.
 * Two rules govern everything below:
 *
 *   1. A place is only ranked on promises that have actually been *decided* —
 *      kept, broken or disputed. Ranking somewhere on three promises that are
 *      all still inside their window says nothing about anybody.
 *   2. Sample size travels with the score. Under `MIN_DECIDED` a place is
 *      marked provisional and sorted below ranked places, rather than being
 *      allowed to top a table on one lucky row.
 *
 * Everything is derived from the same commitments the map is drawn from. There
 * is no separate editorial judgement about any state, district or official.
 */

import { byUrgency, scorecard } from './status';
import type { LiveCommitment, UrgencyBand } from './types';

/** Below this many decided promises, a score is provisional, not a rank. */
export const MIN_DECIDED = 3;

export interface PlaceScore {
  name: string;
  slug: string;
  href: string;
  /** Present for districts, absent for states. */
  stateName?: string;

  total: number;
  kept: number;
  broken: number;
  running: number;
  undated: number;
  unanswered: number;
  disputed: number;
  decided: number;

  /** Kept as a share of decided promises. `null` when nothing is decided. */
  keptRate: number | null;
  /** Mean verified progress across promises still in play, 0-1. */
  liveProgress: number;
  /**
   * How early in the promised window kept promises actually landed, 0-1.
   * Lower is faster. `null` when nothing has been kept.
   */
  speed: number | null;

  /**
   * 0-100. 70% weight on whether promises were kept, 30% on demonstrable
   * movement in the ones still running — because a place with nothing decided
   * yet but real verified progress is doing better than one sitting still.
   * `null` when there is nothing to score.
   */
  score: number | null;
  /** True when `decided < MIN_DECIDED`: a number, but not yet a rank. */
  provisional: boolean;

  reach: number;
  worst: UrgencyBand;
  commitments: LiveCommitment[];
}

const SEVERITY: UrgencyBand[] = [
  'kept', 'undated', 'fresh', 'unanswered', 'soon', 'urgent', 'disputed',
  'critical', 'broken',
];

function worstOf(bands: UrgencyBand[]): UrgencyBand {
  return bands.reduce<UrgencyBand>(
    (worst, b) => (SEVERITY.indexOf(b) > SEVERITY.indexOf(worst) ? b : worst),
    'kept',
  );
}

/**
 * How much of the promised window had been spent when the work was actually
 * verified, 0-1. Lower is faster.
 *
 * The completion moment comes from the audit trail — the first `proof` event on
 * the timeline — not from the current clock. Using `elapsed` here would measure
 * "how long ago was the deadline", so every kept promise past its date would
 * read 100% and the whole metric would be meaningless. Falls back to
 * `updatedAt` when a row has no proof event yet, and returns `null` when there
 * is no window to measure against.
 */
export function completionFraction(c: LiveCommitment): number | null {
  if (!c.deadline) return null;
  const start = Date.parse(c.promisedOn);
  const end = Date.parse(c.deadline);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const proof = c.timeline
    .filter((e) => e.kind === 'proof')
    .map((e) => Date.parse(e.at))
    .filter((t) => Number.isFinite(t) && t >= start)
    .sort((a, b) => a - b)[0];

  const done = proof ?? Date.parse(c.updatedAt);
  if (!Number.isFinite(done)) return null;

  // Clamped: delivering late still counts as kept, it just does not count fast.
  return Math.min(1, Math.max(0, (done - start) / (end - start)));
}

function scoreFor(items: LiveCommitment[], name: string, slug: string, href: string): PlaceScore {
  const s = scorecard(items);
  const decided = s.kept + s.broken + s.disputed;

  const inPlay = items.filter(
    (c) => c.band !== 'kept' && c.band !== 'broken' && c.band !== 'disputed',
  );
  const liveProgress =
    inPlay.length === 0
      ? 0
      : inPlay.reduce((sum, c) => sum + c.progress, 0) / inPlay.length / 100;

  const keptItems = items.filter((c) => c.band === 'kept');
  const fractions = keptItems
    .map(completionFraction)
    .filter((f): f is number => f !== null);
  const speed =
    fractions.length === 0
      ? null
      : fractions.reduce((sum, f) => sum + f, 0) / fractions.length;

  const keptRate = decided === 0 ? null : s.kept / decided;

  const score =
    decided === 0 && inPlay.length === 0
      ? null
      : Math.round(100 * (0.7 * (keptRate ?? 0) + 0.3 * liveProgress));

  return {
    name,
    slug,
    href,
    total: items.length,
    kept: s.kept,
    broken: s.broken,
    running: s.running,
    undated: s.undated,
    unanswered: s.unanswered,
    disputed: s.disputed,
    decided,
    keptRate,
    liveProgress,
    speed,
    score,
    provisional: decided < MIN_DECIDED,
    reach: items.reduce((sum, c) => sum + (c.beneficiaries ?? 0), 0),
    worst: worstOf(items.map((c) => c.band)),
    commitments: [...items].sort(byUrgency),
  };
}

/**
 * Ranked best-first. Fully-ranked places come first; provisional ones follow,
 * so a district with one kept promise can never sit above a state with nine.
 */
function rank(scores: PlaceScore[]): PlaceScore[] {
  return scores.sort((a, b) => {
    if (a.provisional !== b.provisional) return a.provisional ? 1 : -1;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (b.score !== a.score) return b.score - a.score;
    // Same score: whoever delivered earlier in their window is ahead.
    if (a.speed !== null && b.speed !== null && a.speed !== b.speed) {
      return a.speed - b.speed;
    }
    return b.total - a.total;
  });
}

export function stateScores(commitments: LiveCommitment[]): PlaceScore[] {
  const byState = new Map<string, LiveCommitment[]>();
  for (const c of commitments) {
    const list = byState.get(c.stateSlug);
    if (list) list.push(c);
    else byState.set(c.stateSlug, [c]);
  }

  return rank(
    [...byState].map(([slug, items]) =>
      scoreFor(items, items[0].state, slug, `/s/${slug}`),
    ),
  );
}

export function districtScores(commitments: LiveCommitment[]): PlaceScore[] {
  const byDistrict = new Map<string, LiveCommitment[]>();
  for (const c of commitments) {
    // State-wide commitments belong to no district and would otherwise
    // distort whichever bucket they fell into.
    if (!c.districtSlug) continue;
    const key = `${c.stateSlug}:${c.districtSlug}`;
    const list = byDistrict.get(key);
    if (list) list.push(c);
    else byDistrict.set(key, [c]);
  }

  return rank(
    [...byDistrict].map(([key, items]) => {
      const [stateSlug, districtSlug] = key.split(':');
      return {
        ...scoreFor(
          items,
          items[0].district ?? districtSlug,
          districtSlug,
          `/s/${stateSlug}/${districtSlug}`,
        ),
        stateName: items[0].state,
      };
    }),
  );
}

export interface CategoryScore {
  category: string;
  label: string;
  total: number;
  kept: number;
  broken: number;
  unanswered: number;
  keptRate: number | null;
}

export function categoryScores(
  commitments: LiveCommitment[],
  labels: Record<string, string>,
): CategoryScore[] {
  const byCat = new Map<string, LiveCommitment[]>();
  for (const c of commitments) {
    const list = byCat.get(c.category);
    if (list) list.push(c);
    else byCat.set(c.category, [c]);
  }

  return [...byCat]
    .map(([category, items]) => {
      const s = scorecard(items);
      const decided = s.kept + s.broken + s.disputed;
      return {
        category,
        label: labels[category] ?? category,
        total: items.length,
        kept: s.kept,
        broken: s.broken,
        unanswered: s.unanswered,
        keptRate: decided === 0 ? null : s.kept / decided,
      };
    })
    .sort((a, b) => b.total - a.total);
}
