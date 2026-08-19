/**
 * Validation shared by the intake routes.
 *
 * These run on the server, after the form has already checked the same things
 * in the browser. That duplication is deliberate: the form is a courtesy to
 * the person filling it in, and the route is the actual boundary. Anything
 * that matters is checked here, because anyone can post straight at the
 * endpoint and skip the form entirely.
 */

/** How strong a piece of evidence is. Mirrors `evidence_tier` in Postgres. */
export type EvidenceTier =
  | 'signed_document'
  | 'media'
  | 'press_link'
  | 'document_link'
  | 'link_only'
  | 'none';

export const EVIDENCE_TIER_LABEL: Record<EvidenceTier, string> = {
  signed_document: 'Signed document',
  media: 'Photo or scan',
  press_link: 'News report',
  document_link: 'Linked document',
  link_only: 'Link only',
  none: 'No evidence',
};

/**
 * Only http(s) survives. `javascript:` and `data:` URLs in a field that later
 * renders as a link are a stored-XSS delivery mechanism, and a register that
 * publishes citizen-submitted links is exactly where someone would try it.
 */
export function safeHttpUrl(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  let parsed: URL;
  try {
    parsed = new URL(s);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  return parsed.toString().slice(0, 600);
}

export function safeHttpUrls(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(safeHttpUrl).filter(Boolean).slice(0, max);
}

/**
 * The proof rule, in one place.
 *
 * A promise logged with nothing behind it is an allegation about a named
 * person. Any one of an uploaded image, a post link, a news story or a
 * document satisfies this — the bar is "something checkable exists", not
 * "the evidence is good". How good it is, `evidenceTier` answers separately.
 */
export function hasProof(media: string[], sourceUrl: string): boolean {
  return media.length > 0 || sourceUrl.length > 0;
}

/**
 * Weight, not a gate.
 *
 * Deliberately never returns a verdict that would justify refusing a row. A
 * villager with one WhatsApp screenshot and a district officer with a signed
 * order both get onto the register; the register simply says which is which,
 * and a reviewer weighs them accordingly.
 *
 * Must agree with the generated column of the same name in schema.sql.
 */
export function evidenceTier(opts: {
  media: string[];
  sourceUrl: string;
  receiptKind: string;
  signed: boolean;
}): EvidenceTier {
  if (opts.signed && opts.media.length > 0) return 'signed_document';
  if (opts.media.length > 0) return 'media';
  if (opts.receiptKind === 'press_report') return 'press_link';
  if (opts.receiptKind === 'written_order') return 'document_link';
  if (opts.sourceUrl) return 'link_only';
  return 'none';
}

/** The message shown when proof is missing. Same words in the form and the API. */
export const NO_PROOF_MESSAGE =
  'Add proof before logging this: a photo, a screenshot, or a link to the post, news report or order. Without something checkable this is an allegation against a named person, and the register does not carry those.';

/**
 * What a failed write tells the person who triggered it.
 *
 * A Postgres error text names the table, the column and often the constraint
 * that rejected the row. On a public endpoint that is a free schema map for
 * anyone probing, and it is useless to the person who actually just wanted to
 * log a promise. The detail goes to the server log where an operator can read
 * it; the caller gets a sentence they can act on.
 *
 * `/api/review/decide` deliberately does NOT use this. It sits behind the
 * review token, its only caller is an operator, and there the real message is
 * the whole point.
 */
export function intakeFailure(scope: string, detail: string): string {
  // Server-side only — this file is never imported by a client component.
  console.error(`[intake:${scope}] ${detail}`);
  return 'Could not save that just now. Nothing was stored, so please try again.';
}

/**
 * The largest intake body worth reading.
 *
 * A 6MB request was accepted before this existed. Nothing in it survived —
 * `publisher` is sliced to 120 characters, `rawText` to 8000 — but the server
 * still parsed six megabytes of JSON to discover that, and on a per-request
 * billed platform the parsing IS the attack. A real submission with 25 drafts
 * and 12 media URLs comes to a few kilobytes, so this is generous by two
 * orders of magnitude.
 */
export const MAX_INTAKE_BYTES = 256 * 1024;

/**
 * Rejects an oversized body before `request.json()` is called.
 *
 * Content-Length can be absent or lied about, so this is a cheap first gate
 * rather than the whole defence; the platform enforces its own hard ceiling
 * above it. What it does reliably stop is the honest large payload, which is
 * what a script hammering the endpoint actually sends.
 */
export function bodyTooLarge(request: Request): boolean {
  const len = Number(request.headers.get('content-length') ?? '0');
  return Number.isFinite(len) && len > MAX_INTAKE_BYTES;
}

export const TOO_LARGE_MESSAGE =
  'That request is too big. Paste the post text rather than a whole page, and attach photos as files.';

/**
 * Did Postgres refuse this because the caller is going too fast?
 *
 * The rate limit is a trigger, so it arrives as an ordinary insert error. It
 * deserves a 429 and a sentence a person can act on, not the generic failure
 * every other database error gets.
 */
export function isRateLimited(message: string): boolean {
  return /rate limit reached/i.test(message);
}

export const RATE_LIMITED_MESSAGE =
  'You have logged a lot in the last hour. Give it an hour and carry on — the limit exists so a flood cannot bury the queue a person has to read.';
