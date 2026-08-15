/**
 * Turning a post into tracked commitments.
 *
 * The point of this file is that nobody should have to hand-key a promise.
 * Somebody pastes the whole post — text, links, handles — and gets back a list
 * of candidate commitments with dates already computed, which a human then
 * corrects before saving. It is deliberately a *draft generator*: it guesses,
 * flags what it guessed, and never saves anything on its own.
 *
 * Pure and synchronous so the /submit page can run it on every keystroke.
 */

import { slugify } from './format';
import type { Category } from './types';

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, sixty: 60, ninety: 90,
  // Hindi/Hinglish numerals show up constantly in these posts.
  ek: 1, do: 2, teen: 3, char: 4, panch: 5, saat: 7, das: 10,
};

const UNIT_MS: Record<string, number> = {
  hour: 3600_000,
  hr: 3600_000,
  day: 86_400_000,
  din: 86_400_000,
  week: 7 * 86_400_000,
  hafte: 7 * 86_400_000,
  fortnight: 14 * 86_400_000,
  month: 30 * 86_400_000,
  mahine: 30 * 86_400_000,
  year: 365 * 86_400_000,
  saal: 365 * 86_400_000,
};

const UNIT_ALIASES = Object.keys(UNIT_MS).join('|');
const NUMBER_ALIASES = Object.keys(NUMBER_WORDS).join('|');

/**
 * Matches "within one week", "in the next 48 hours", "in three months",
 * "48 hrs", "within 7 days". The leading preposition is optional because the
 * phrase often arrives bare: "seven rooms in three months".
 */
const DURATION_RE = new RegExp(
  String.raw`(?:with[ie]n|in|after|by|next)?\s*(?:the\s+)?(?:next\s+)?` +
    String.raw`(\d{1,4}|${NUMBER_ALIASES})[\s-]*` +
    String.raw`(${UNIT_ALIASES})s?\b`,
  'i',
);

/** Phrases that mean "now" and therefore deserve a short, explicit clock. */
const IMMEDIATE_RE =
  /\b(immediately|at once|right away|same day|today|turant|foran|within hours)\b/i;

/**
 * Durations that describe something rather than commit to it.
 *
 * "a three-week-long protest" is not a three-week deadline; "the 15-day-old
 * agitation" is not a promise; "for the last two months" points backwards.
 * These crept in as soon as extraction moved from tweets to article prose, and
 * each one costs a reviewer real time, so they are cut before the parse.
 */
const DESCRIPTIVE_RE = new RegExp(
  String.raw`(?:` +
    // "three-week-long", "15-day-old"
    String.raw`(?:\d{1,4}|${Object.keys(NUMBER_WORDS).join('|')})[\s-]*(?:${Object.keys(UNIT_MS).join('|')})s?[\s-]*(?:long|old)\b` +
    // backward-looking: "for the last two months", "over the past 3 weeks"
    String.raw`|\b(?:for|over|since|during|after|past|last)\s+(?:the\s+)?(?:last|past)?\s*(?:\d{1,4}|${Object.keys(NUMBER_WORDS).join('|')})[\s-]*(?:${Object.keys(UNIT_MS).join('|')})s?\b` +
    // "aged 12 years", "a 40-year-old"
    String.raw`|\baged?\s+\d{1,3}\b` +
    String.raw`)`,
  'i',
);

/**
 * A sentence is a candidate commitment only if it contains a marker of future
 * obligation. Without this the extractor returns the whole post as "promises",
 * which is worse than returning nothing.
 */
const OBLIGATION_RE =
  /\b(will be|will |shall |to be |are to |is to |has been (?:agreed|accepted)|assured|promised|committed|guarantee[ds]?|ensure[ds]?|get .{0,30}(?:fixed|done|repaired|built)|would be)\b/i;

const CATEGORY_HINTS: [Category, RegExp][] = [
  ['education', /\b(school|classroom|teacher|principal|student|exam|syllabus|library|lab|scholarship)\b/i],
  ['infrastructure', /\b(road|bridge|building|room|construct|repair|playground|electricity|wiring|fan|furniture|desk|bench)\b/i],
  ['water', /\b(water|toilet|washroom|sanitation|drainage|ro plant|cooler|drinking)\b/i],
  ['health', /\b(health|hospital|clinic|meal|food|mess|nutrition|doctor|medicine)\b/i],
  ['safety', /\b(safety|police|crossing|river|flood|security|harass|assault)\b/i],
  ['jobs', /\b(recruit|vacancy|appointment|job|posting|jpsc|jssc|ssc|exam calendar)\b/i],
  ['governance', /\b(inquiry|committee|probe|notice|suspend|transfer|resign|fir|audit|report)\b/i],
];

export interface ExtractedCommitment {
  title: string;
  detail: string;
  /** ISO deadline, or null when the sentence carried no time. */
  deadline: string | null;
  /** The phrase the deadline came from, verbatim. */
  deadlineLabel: string | null;
  category: Category;
  /** Names that look like officials, taken from vocative phrasing. */
  namedOfficials: string[];
  slug: string;
  /**
   * How much a human should distrust this row. 'low' rows still need review;
   * they are just less likely to be wrong.
   */
  confidence: 'low' | 'medium' | 'high';
}

export interface ExtractionResult {
  commitments: ExtractedCommitment[];
  handles: string[];
  urls: string[];
  /** Sentences that were skipped, so a reviewer can see what was dropped. */
  ignored: string[];
}

/** Splits on sentence ends *and* newlines — these posts are line-broken prose. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

export function parseDuration(text: string): { ms: number; label: string } | null {
  // A sentence whose only time expression describes the past or the length of
  // something is not stating a deadline, whatever else it says.
  const descriptive = DESCRIPTIVE_RE.exec(text);
  if (descriptive) {
    const stripped = text.replace(DESCRIPTIVE_RE, ' ');
    // Re-run against what is left, in case a real deadline sits alongside it:
    // "after three weeks of protest, repairs will be done within 10 days".
    return stripped.trim().length > 12 && stripped !== text
      ? parseDuration(stripped)
      : null;
  }

  const immediate = IMMEDIATE_RE.exec(text);
  if (immediate) {
    // "Immediately" is treated as 48 hours: short enough to be a real clock,
    // long enough that nobody can call it unfair.
    return { ms: 2 * 86_400_000, label: immediate[0].toLowerCase() };
  }

  const m = DURATION_RE.exec(text);
  if (!m) return null;

  const rawCount = m[1].toLowerCase();
  const count = /^\d+$/.test(rawCount) ? Number(rawCount) : NUMBER_WORDS[rawCount];
  const unit = UNIT_MS[m[2].toLowerCase()];
  if (!count || !unit) return null;

  return { ms: count * unit, label: m[0].trim().replace(/\s+/g, ' ').toLowerCase() };
}

function categorise(text: string): Category {
  for (const [cat, re] of CATEGORY_HINTS) {
    if (re.test(text)) return cat;
  }
  return 'governance';
}

/**
 * Names in these posts arrive as direct address: "Madan Dilawar ji, get the
 * schools fixed". Two or three capitalised words followed by an honorific or a
 * comma is the reliable shape.
 */
function namedOfficials(text: string): string[] {
  const out = new Set<string>();
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s+(?:ji|sir|madam|saheb|sahab)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[1]);
  return [...out];
}

/** Compresses a sentence into an imperative-ish headline. */
function toTitle(sentence: string): string {
  let t = sentence
    .replace(/^(and|also|so|then|but)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?।]+$/, '');
  if (t.length > 90) t = `${t.slice(0, 87).trimEnd()}…`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * @param text  the full post
 * @param now   the moment the promise was made; deadlines are offsets from it
 */
export function extractCommitments(text: string, now: number = Date.now()): ExtractionResult {
  const handles = [...new Set(text.match(/@[A-Za-z0-9_]{2,15}/g) ?? [])];
  const urls = [...new Set(text.match(/https?:\/\/\S+/g) ?? [])];

  const commitments: ExtractedCommitment[] = [];
  const ignored: string[] = [];

  for (const raw of sentences(text)) {
    // Strip handles and links so they cannot be mistaken for content.
    const s = raw.replace(/@[A-Za-z0-9_]{2,15}/g, '').replace(/https?:\/\/\S+/g, '').trim();
    if (s.length < 12) continue;

    if (!OBLIGATION_RE.test(s)) {
      ignored.push(raw);
      continue;
    }

    const duration = parseDuration(s);
    const title = toTitle(s);

    commitments.push({
      title,
      detail: raw.trim(),
      deadline: duration ? new Date(now + duration.ms).toISOString() : null,
      deadlineLabel: duration?.label ?? null,
      category: categorise(s),
      namedOfficials: namedOfficials(raw),
      slug: slugify(title).slice(0, 60),
      // A sentence with both an obligation marker and a real duration is about
      // as good as this gets without a human.
      confidence: duration ? (duration.label.length > 4 ? 'high' : 'medium') : 'low',
    });
  }

  return { commitments, handles, urls, ignored };
}
