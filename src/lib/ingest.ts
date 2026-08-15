/**
 * Automated discovery of new promises.
 *
 * Runs daily against a registry of sources, pulls anything that reads like an
 * official accepting a demand, and drops it into the review queue.
 *
 * WHY NOTHING PUBLISHES ITSELF.
 *
 * It would be easy to have this write straight into `commitments` and watch the
 * map fill up. It would also be the end of the register as evidence. A machine
 * that decides on its own that a named minister promised something, and paints
 * that on a public map, will eventually be wrong about a real person — and one
 * such row discredits every correct row next to it. So the pipeline's output is
 * always a *candidate*, and a human promotes it.
 *
 * WHY RSS AND NOT SCRAPING.
 *
 * X/Twitter is authenticated and returns 402 to anonymous fetches; scraping it
 * means either paying for the API or evading a block, and the second is not
 * something this project should do. News RSS is public, stable, and carries the
 * quotes that matter anyway, because these commitments get reported. An X
 * adapter is stubbed for operators who hold a key.
 */

import { extractCommitments, type ExtractedCommitment } from './extract';
import { slugify } from './format';
import type { Category } from './types';

export type SourceKindIn = 'rss' | 'atom' | 'json' | 'x_api';

export interface IngestSource {
  id: string;
  label: string;
  url: string;
  kind: SourceKindIn;
  /**
   * Only items matching one of these survive the first pass. Without it the
   * queue fills with sport and the reviewer stops looking at it.
   */
  mustMatch: RegExp;
  /** Hint for the reviewer; the extractor still decides per sentence. */
  defaultCategory: Category;
  /** Set false to keep a source in the file but out of the run. */
  enabled: boolean;
  /**
   * Whether the item `<link>` is a real article URL we can fetch and read.
   *
   * False for Google News, whose links are not redirects but a 600KB
   * JavaScript shell — there is no article behind them to read. Those feeds are
   * still valuable for *discovery*: they surface the story from every outlet
   * that covered it, and a reviewer opens it by hand. The dates live in article
   * bodies, so only fetchable sources can produce draft rows.
   */
  fetchable: boolean;
}

/**
 * The registry, in two tiers.
 *
 * PUBLISHER FEEDS carry direct article URLs, so their bodies can be read and
 * real deadlines parsed out. They are broad national feeds, narrowed by
 * `mustMatch` — a promise story is a small slice of any day's news.
 *
 * DISCOVERY FEEDS are Google News queries. One query covers every outlet that
 * covered a story, which is exactly the reach this needs when a promise made in
 * a Barmer village is reported by two local papers and nobody else. Their links
 * are unreadable by machine, so they only ever produce leads for a human.
 */
export const SOURCES: IngestSource[] = [
  // ---- Publisher feeds: fetchable, can yield dated draft rows ----
  {
    id: 'ie-india',
    label: 'The Indian Express, India',
    url: 'https://indianexpress.com/section/india/feed/',
    kind: 'rss',
    mustMatch:
      /school|classroom|teacher|student|water|toilet|sanitation|road|hospital|protest|dharna|villager/i,
    defaultCategory: 'governance',
    enabled: true,
    fetchable: true,
  },
  {
    id: 'ht-india',
    label: 'Hindustan Times, India',
    url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',
    kind: 'rss',
    mustMatch:
      /school|classroom|teacher|student|water|toilet|sanitation|road|hospital|protest|dharna|villager/i,
    defaultCategory: 'governance',
    enabled: true,
    fetchable: true,
  },
  {
    id: 'thehindu-national',
    label: 'The Hindu, National',
    url: 'https://www.thehindu.com/news/national/feeder/default.rss',
    kind: 'rss',
    mustMatch:
      /school|classroom|teacher|student|water|toilet|sanitation|road|hospital|protest|dharna|villager/i,
    defaultCategory: 'governance',
    enabled: true,
    fetchable: true,
  },
  {
    id: 'toi-india',
    label: 'Times of India, India',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
    kind: 'rss',
    mustMatch:
      /school|classroom|teacher|student|water|toilet|sanitation|road|hospital|protest|dharna|villager/i,
    defaultCategory: 'governance',
    enabled: true,
    fetchable: true,
  },

  // ---- Discovery feeds: leads only ----
  {
    id: 'gn-school-promise',
    label: 'Discovery: school infrastructure commitments',
    url: 'https://news.google.com/rss/search?q=school+students+protest+%22within%22+OR+%22deadline%22+OR+%22assured%22+India&hl=en-IN&gl=IN&ceid=IN:en',
    kind: 'rss',
    mustMatch: /school|classroom|teacher|student|college|vidyalaya/i,
    defaultCategory: 'education',
    enabled: true,
    fetchable: false,
  },
  {
    id: 'gn-official-assurance',
    label: 'Discovery: official assurances after protests',
    url: 'https://news.google.com/rss/search?q=%22officials+assured%22+OR+%22demands+accepted%22+protest+India&hl=en-IN&gl=IN&ceid=IN:en',
    kind: 'rss',
    mustMatch: /assur|accept|agree|promis|undertak/i,
    defaultCategory: 'governance',
    enabled: true,
    fetchable: false,
  },
  {
    id: 'gn-dm-deadline',
    label: 'Discovery: district administration deadlines',
    url: 'https://news.google.com/rss/search?q=%22district+magistrate%22+OR+%22collector%22+deadline+repair+India&hl=en-IN&gl=IN&ceid=IN:en',
    kind: 'rss',
    mustMatch: /magistrate|collector|sdm|deo|panchayat|municipal/i,
    defaultCategory: 'infrastructure',
    enabled: true,
    fetchable: false,
  },
  {
    id: 'gn-water-sanitation',
    label: 'Discovery: water and sanitation commitments',
    url: 'https://news.google.com/rss/search?q=village+water+OR+toilet+OR+handpump+%22will+be%22+deadline+India&hl=en-IN&gl=IN&ceid=IN:en',
    kind: 'rss',
    mustMatch: /water|toilet|sanitation|handpump|drainage/i,
    defaultCategory: 'water',
    enabled: true,
    fetchable: false,
  },

  {
    id: 'x-cjp',
    label: 'X protest accounts',
    url: 'https://api.x.com/2/tweets/search/recent',
    kind: 'x_api',
    mustMatch: /./,
    defaultCategory: 'governance',
    // Anonymous fetches get 402. Parked until an operator supplies a key.
    enabled: false,
    fetchable: false,
  },
];

export interface FeedItem {
  sourceId: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

/**
 * Minimal RSS/Atom reader.
 *
 * A regex parser rather than a DOM one because Node has no DOMParser and
 * pulling in a full XML library for four tags is not worth the dependency
 * surface on a route that runs unattended.
 */
export function parseFeed(xml: string, sourceId: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];

  for (const block of blocks) {
    const title = decodeXml(pick(block, 'title'));
    const summary = decodeXml(pick(block, 'description') || pick(block, 'summary'));
    const link =
      pick(block, 'link') ||
      block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ||
      '';
    const date =
      pick(block, 'pubDate') || pick(block, 'published') || pick(block, 'updated');

    if (!title || !link) continue;

    const parsed = Date.parse(date);
    items.push({
      sourceId,
      title,
      // Feed descriptions are HTML fragments; the extractor wants prose.
      summary: stripTags(summary),
      url: link.trim(),
      publishedAt: Number.isFinite(parsed)
        ? new Date(parsed).toISOString()
        : new Date().toISOString(),
    });
  }

  return items;
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * Headlines that signal a promise event even though the headline itself carries
 * no date. "Govt says 98% demands accepted" is not extractable, but it is
 * absolutely something a reviewer should read — the dates are in the article.
 */
export const LEAD_RE =
  /\b(demands?\s+(?:were\s+)?accepted|accepts?\s+(?:key\s+)?demands?|assur\w+|agreed to|deadline|time.?bound|will be (?:completed|repaired|built|provided)|orders?\s+repair|directs?\b|undertak\w+|promis\w+)\b/i;

export interface Candidate {
  sourceId: string;
  sourceLabel: string;
  headline: string;
  url: string;
  publishedAt: string;
  text: string;
  commitments: ExtractedCommitment[];
  /**
   * `extracted` — at least one dated commitment was parsed out of the article
   * body, so the reviewer gets draft rows.
   * `lead` — the headline reads like a promise event but nothing datable came
   * out. Still queued, because a human reading the source is the point; the
   * machine's job is to find the story, not to write the entry.
   */
  tier: 'extracted' | 'lead';
  /** Place names guessed from the text. A reviewer confirms them. */
  guessedState?: string;
  guessedDistrict?: string;
  /** Stable hash so the same story is not queued twice. */
  fingerprint: string;
}

/**
 * Cheap, stable content hash. Not cryptographic — it only has to be consistent
 * across runs so yesterday's story is recognised today.
 */
export function fingerprint(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 + ch, 0x85ebca6b) ^ (h2 >>> 13);
  }
  return (
    (h1 >>> 0).toString(36).padStart(7, '0') +
    (h2 >>> 0).toString(36).padStart(7, '0')
  );
}

/**
 * Strips an article page down to readable prose.
 *
 * Crude on purpose. A real readability implementation is a large dependency,
 * and all this needs is enough clean text for the sentence extractor to find
 * "the road will be repaired within 15 days" — which sits in ordinary body
 * paragraphs on every news site.
 */
export function extractArticleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(?:nav|header|footer|aside|form)[\s\S]*?<\/(?:nav|header|footer|aside|form)>/gi, ' ')
    // Keep paragraph boundaries — the extractor splits on sentence ends and
    // newlines, so losing them would glue unrelated sentences together.
    .replace(/<\/(?:p|div|h[1-6]|li|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * Which feed items are worth spending an article fetch on.
 *
 * Fetching every one of ~200 items a run would be slow and rude to publishers.
 * This narrows to the ones whose headline reads like a promise event, which is
 * a small fraction.
 */
export function worthFetching(
  items: FeedItem[],
  sources: IngestSource[],
  limit = 24,
): FeedItem[] {
  const byId = new Map(sources.map((s) => [s.id, s] as const));
  const seen = new Set<string>();

  return items
    .filter((item) => {
      const source = byId.get(item.sourceId);
      // Only publisher feeds have an article behind the link worth fetching.
      if (!source?.fetchable) return false;

      // Topic relevance only — deliberately NOT the promise-signal test.
      // "Officials assured repairs within 15 days" is a sentence that lives in
      // paragraph six, not in the headline, so screening headlines for promise
      // language here would discard precisely the articles worth reading. The
      // body decides; this filter only keeps us off the sports pages.
      const text = `${item.title}. ${item.summary}`;
      if (!source.mustMatch.test(text)) return false;

      const key = slugify(item.title).slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
}

/**
 * Everything that passes the topic and promise-signal filters, from every
 * source — including the discovery feeds whose articles cannot be read.
 * Near-duplicates across feeds are collapsed by title.
 */
export function relevantItems(
  items: FeedItem[],
  sources: IngestSource[],
  limit = 60,
): FeedItem[] {
  const byId = new Map(sources.map((s) => [s.id, s] as const));
  const seen = new Set<string>();

  return items
    .filter((item) => {
      const source = byId.get(item.sourceId);
      if (!source) return false;
      const text = `${item.title}. ${item.summary}`;
      if (!source.mustMatch.test(text)) return false;
      if (!LEAD_RE.test(text)) return false;
      const key = slugify(item.title).slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
}

/**
 * Turns feed items into review candidates.
 *
 * `bodies` maps item URL to the fetched article text. Extraction runs against
 * headline *plus* body, because Google News descriptions are a link stub and a
 * commitment almost never fits in a headline — the whole reason the earlier
 * version of this returned nothing.
 *
 * `knownStates` and `knownDistricts` come from the geo dataset so a story
 * mentioning "Alwar" arrives pre-tagged, saving the reviewer the lookup.
 */
export function toCandidates(
  items: FeedItem[],
  sources: IngestSource[],
  knownStates: string[],
  /**
   * District names *per state*, so a Jharkhand story cannot be tagged with a
   * Gujarat district that happens to appear in the text. Cross-state matching
   * produced exactly that and sent reviewers to the wrong place.
   */
  districtsByState: Map<string, string[]>,
  bodies: Map<string, string> = new Map(),
): Candidate[] {
  const byId = new Map(sources.map((s) => [s.id, s] as const));
  const out: Candidate[] = [];

  for (const item of items) {
    const source = byId.get(item.sourceId);
    if (!source) continue;

    const headline = `${item.title}. ${item.summary}`;
    if (!source.mustMatch.test(headline)) continue;

    const body = bodies.get(item.url) ?? '';
    // The promise-signal gate applies only when all we have is a headline.
    // Once the body is in hand, the extractor is a far better judge than a
    // regex over a sub-editor's word choice.
    if (!body && !LEAD_RE.test(headline)) continue;

    const text = body ? `${item.title}.\n${body}` : headline;

    const extraction = extractCommitments(text, Date.parse(item.publishedAt));
    // A dated commitment is what makes a draft row worth showing. Undated
    // machine output is nearly always a false positive, whereas an undated
    // promise entered by a human who watched it happen is a real finding —
    // different bars for different sources.
    const dated = extraction.commitments.filter((c) => c.deadline !== null);

    // An article we read that yielded nothing, and whose headline never
    // suggested a promise either, is just news. Drop it rather than filling the
    // queue — a queue nobody can face reading is the same as no queue.
    if (dated.length === 0 && !LEAD_RE.test(headline)) continue;

    const guessedState = knownStates.find((s) =>
      new RegExp(`\\b${escape(s)}\\b`, 'i').test(text),
    );
    // Districts are only looked for inside the state we think this is about.
    const guessedDistrict = guessedState
      ? (districtsByState.get(guessedState) ?? []).find((d) =>
          new RegExp(`\\b${escape(d)}\\b`, 'i').test(text),
        )
      : undefined;

    out.push({
      sourceId: source.id,
      sourceLabel: source.label,
      headline: item.title,
      url: item.url,
      publishedAt: item.publishedAt,
      // Cap what is stored: enough for the reviewer to judge, not the article.
      text: text.slice(0, 4000),
      commitments: dated.slice(0, 12),
      tier: dated.length > 0 ? 'extracted' : 'lead',
      guessedState,
      guessedDistrict,
      fingerprint: fingerprint(`${source.id}|${item.url}|${item.title}`),
    });
  }

  return out;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Drops candidates that describe a promise already on the register.
 *
 * Matching is on slugified title plus state, which is loose on purpose: a
 * near-duplicate landing in the queue costs a reviewer ten seconds, whereas a
 * missed genuine promise costs the register a row it should have had.
 */
export function dedupe(
  candidates: Candidate[],
  existingTitles: { title: string; state: string }[],
  seenFingerprints: Set<string>,
): Candidate[] {
  const existing = new Set(
    existingTitles.map((e) => `${slugify(e.state)}:${slugify(e.title).slice(0, 40)}`),
  );

  return candidates.filter((c) => {
    if (seenFingerprints.has(c.fingerprint)) return false;
    if (!c.guessedState || c.commitments.length === 0) return true;
    return !c.commitments.every((cm) =>
      existing.has(`${slugify(c.guessedState!)}:${slugify(cm.title).slice(0, 40)}`),
    );
  });
}
