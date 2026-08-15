import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCommitments } from '@/lib/data';
import { getServiceSupabase } from '@/lib/supabase';
import { STATES } from '@/lib/geo';
import {
  SOURCES,
  parseFeed,
  toCandidates,
  dedupe,
  worthFetching,
  relevantItems,
  extractArticleText,
  type FeedItem,
} from '@/lib/ingest';

/**
 * The daily sweep for new promises.
 *
 * Vercel Cron can only issue GET, so GET is the real run. `?preview=1` reports
 * what it would queue without writing anything, which is what to use by hand.
 *
 * Safety here does not come from the HTTP verb — it comes from CRON_SECRET
 * gating the endpoint, and from the fact that everything this finds is a
 * *candidate*. Nothing in this file can put a row on the map; that needs a
 * human in `/review`. See the note at the top of lib/ingest.ts for why.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const provided = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (provided.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

/** Fingerprints already in the queue, so a story is never queued twice. */
async function seenFingerprints(): Promise<Set<string>> {
  const sb = getServiceSupabase();
  if (!sb) return new Set();
  const { data, error } = await sb.from('ingest_candidates').select('fingerprint');
  if (error || !data) return new Set();
  return new Set((data as { fingerprint: string }[]).map((r) => r.fingerprint));
}

async function fetchSource(source: (typeof SOURCES)[number]): Promise<{
  items: FeedItem[];
  error?: string;
}> {
  if (source.kind === 'x_api') {
    // Anonymous requests to X return 402. Rather than pretend, this reports
    // the reason so the operator can see exactly why the source is quiet.
    if (!process.env.X_BEARER_TOKEN) {
      return { items: [], error: 'X_BEARER_TOKEN not set — source skipped.' };
    }
  }

  try {
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'VaadaBot/1.0 (public accountability register)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      // Cron output must be fresh; a cached feed defeats the point.
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { items: [], error: `HTTP ${res.status}` };
    return { items: parseFeed(await res.text(), source.id) };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : 'Fetch failed.',
    };
  }
}

/**
 * Fetches the article bodies for the shortlisted items.
 *
 * Google News links are redirects to the publisher, so `redirect: 'follow'` is
 * doing real work here. Failures are silent by design: a paywall or a bot wall
 * is normal, and the candidate still gets queued as a lead for a human to open
 * by hand. Concurrency is capped so a run cannot hammer one publisher.
 */
async function fetchBodies(items: FeedItem[]): Promise<Map<string, string>> {
  const bodies = new Map<string, string>();
  const BATCH = 4;

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (item) => {
        try {
          const res = await fetch(item.url, {
            headers: {
              'User-Agent': 'VaadaBot/1.0 (public accountability register)',
              Accept: 'text/html,application/xhtml+xml',
            },
            redirect: 'follow',
            cache: 'no-store',
            signal: AbortSignal.timeout(12_000),
          });
          if (!res.ok) return;
          const text = extractArticleText(await res.text());
          // Anything shorter than this is a consent wall or an error page.
          if (text.length > 400) bodies.set(item.url, text.slice(0, 12_000));
        } catch {
          // Deliberately swallowed — see the note above.
        }
      }),
    );
  }

  return bodies;
}

async function run(persist: boolean) {
  const enabled = SOURCES.filter((s) => s.enabled);
  const results = await Promise.all(enabled.map(fetchSource));

  const items = results.flatMap((r) => r.items);
  const sourceReport = enabled.map((s, i) => ({
    id: s.id,
    label: s.label,
    items: results[i].items.length,
    error: results[i].error,
  }));

  const knownStates = STATES.map((s) => s.name);
  const districtsByState = new Map(STATES.map((s) => [s.name, s.districts] as const));

  const [existing, seen] = await Promise.all([getCommitments(), seenFingerprints()]);

  // Only publisher articles get fetched; discovery items go straight through
  // as leads because there is nothing readable behind their links.
  const shortlist = worthFetching(items, enabled);
  const bodies = await fetchBodies(shortlist);

  // Fetched articles are judged on their body; everything else on its headline.
  // Union, de-duplicated by URL, so a fetched article is never dropped just
  // because its headline was not promise-shaped.
  const forCandidates = [
    ...new Map(
      [...shortlist, ...relevantItems(items, enabled)].map((i) => [i.url, i]),
    ).values(),
  ];

  const candidates = dedupe(
    toCandidates(forCandidates, enabled, knownStates, districtsByState, bodies),
    existing.map((c) => ({ title: c.title, state: c.state })),
    seen,
  );

  const sb = getServiceSupabase();
  let stored = 0;

  if (persist && sb && candidates.length > 0) {
    const { error } = await sb.from('ingest_candidates').insert(
      candidates.map((c) => ({
        fingerprint: c.fingerprint,
        source_id: c.sourceId,
        source_label: c.sourceLabel,
        headline: c.headline,
        url: c.url,
        published_at: c.publishedAt,
        raw_text: c.text.slice(0, 8000),
        guessed_state: c.guessedState ?? null,
        guessed_district: c.guessedDistrict ?? null,
        tier: c.tier,
        drafts: c.commitments,
        review_status: 'queued',
      })),
    );
    if (!error) stored = candidates.length;
  }

  // The register's numbers are derived from its rows, so once the queue has
  // moved, the pages that summarise it are rebuilt on next request.
  if (stored > 0) {
    revalidatePath('/');
    revalidatePath('/review');
  }

  return {
    ranAt: new Date().toISOString(),
    mode: persist ? 'store' : 'preview',
    storeConfigured: Boolean(sb),
    sources: sourceReport,
    itemsFetched: items.length,
    shortlisted: shortlist.length,
    articlesRead: bodies.size,
    candidates: candidates.length,
    withDrafts: candidates.filter((c) => c.tier === 'extracted').length,
    leads: candidates.filter((c) => c.tier === 'lead').length,
    stored,
    preview: candidates.slice(0, 10).map((c) => ({
      headline: c.headline,
      url: c.url,
      tier: c.tier,
      publishedAt: c.publishedAt,
      guessedState: c.guessedState,
      guessedDistrict: c.guessedDistrict,
      promises: c.commitments.map((cm) => ({
        title: cm.title,
        deadline: cm.deadline,
        deadlineLabel: cm.deadlineLabel,
        category: cm.category,
        confidence: cm.confidence,
      })),
    })),
  };
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorised' }, { status: 401 });
  }
  const preview = new URL(request.url).searchParams.get('preview') === '1';
  return NextResponse.json({ ok: true, ...(await run(!preview)) });
}

export const POST = GET;
