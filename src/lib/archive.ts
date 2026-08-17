/**
 * Archive links.
 *
 * The weakest thing in this register is a source that is a bare link. Posts get
 * deleted, news sites reorganise, and paywalls close. When that happens the
 * entry is asserting something it can no longer show, which is exactly the
 * moment an official says "I never said that".
 *
 * The Internet Archive fixes this for free and without an account. Every source
 * on the site therefore carries a second link to its archived copy, so a reader
 * can check the claim even after the original is gone.
 *
 * Pure string building. Nothing here talks to the network at render time.
 */

/** A permanent view of whatever the archive already holds for this URL. */
export function waybackUrl(url: string): string {
  return `https://web.archive.org/web/2/${encodeURI(url)}`;
}

/**
 * Asks the archive to capture the page now.
 *
 * Deliberately only ever surfaced as a link for a human to click, never fetched
 * automatically: `/save/` is a heavy, rate-limited endpoint and firing it on
 * page render would be abusive.
 */
export function waybackSaveUrl(url: string): string {
  return `https://web.archive.org/save/${encodeURI(url)}`;
}

/** The domain, for showing a reader who is actually vouching for a claim. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Whether a link is likely to survive.
 *
 * Social posts are the fragile case: a single delete removes the evidence, and
 * they are also the most common source for these commitments. Flagging them is
 * what prompts somebody to archive the page while it still exists.
 */
export function isFragile(url: string): boolean {
  return /(^|\.)(x\.com|twitter\.com|facebook\.com|instagram\.com|t\.me|threads\.net)$/i.test(
    hostOf(url),
  );
}
