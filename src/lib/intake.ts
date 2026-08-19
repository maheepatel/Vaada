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
