'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase, ensureAnonSession, isSupabaseConfigured } from '@/lib/supabase';
import { EVIDENCE_TIER_LABEL, type EvidenceTier } from '@/lib/intake';
import { formatDate, formatDateTime } from '@/lib/format';
import { Card, Empty } from '@/components/ui';

/**
 * Everything this browser has logged.
 *
 * Client-side on purpose. The rows are readable only to the identity that
 * created them — the `read own submissions` policy compares `user_id` against
 * `auth.uid()` — so the query has to run where the session lives. There is no
 * server route to leak, and no reviewer-shaped endpoint to lock down: Postgres
 * simply returns nothing to anybody else.
 */

interface Row {
  id: string;
  state: string;
  district: string | null;
  locality: string;
  promised_on: string;
  created_at: string;
  review_status: 'queued' | 'accepted' | 'rejected';
  evidence_tier: EvidenceTier;
  source_url: string;
  receipt_media: string[] | null;
  drafts: { title?: string; deadlineLabel?: string | null }[];
}

const STATUS: Record<Row['review_status'], { label: string; hint: string; token: string }> = {
  queued: {
    label: 'Waiting for review',
    hint: 'A person reads the source before this reaches the map.',
    token: 'soon',
  },
  accepted: {
    label: 'On the register',
    hint: 'Checked and published.',
    token: 'kept',
  },
  rejected: {
    label: 'Not published',
    hint: 'It could not be checked against its source.',
    token: 'unanswered',
  },
};

export default function MyLogsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) setError('no-db');
        return;
      }
      await ensureAnonSession();
      const sb = getBrowserSupabase();
      if (!sb) {
        if (!cancelled) setError('no-db');
        return;
      }
      const { data, error: err } = await sb
        .from('submissions')
        .select(
          'id,state,district,locality,promised_on,created_at,review_status,evidence_tier,source_url,receipt_media,drafts',
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (cancelled) return;
      if (err) setError(err.message);
      else setRows((data ?? []) as Row[]);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="eyebrow">Yours</p>
        <h1 className="h-page display mt-2">Promises you logged</h1>
        <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-ink-2">
          Kept on this device, under an identity created for you automatically.
          No account, no password, nothing to remember. Clearing your browser
          data clears this list, so add your email when you log something you
          want to follow.
        </p>
      </header>

      {error === 'no-db' && (
        <Card className="p-5">
          <p className="text-[0.95rem] font-semibold">No database connected.</p>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">
            Submissions are validated but not stored until Supabase is
            configured, so there is nothing to show here yet.
          </p>
        </Card>
      )}

      {error && error !== 'no-db' && (
        <Card className="p-5">
          <p className="text-[0.95rem] font-semibold">Could not load your logs.</p>
          <p className="mt-2 text-[0.85rem] text-ink-2">{error}</p>
        </Card>
      )}

      {!error && rows === null && (
        <p className="text-[0.85rem] text-ink-3">Loading…</p>
      )}

      {!error && rows !== null && rows.length === 0 && (
        <Empty
          title="You have not logged anything yet."
          hint="Paste a post on the Log a promise page and it will appear here."
        />
      )}

      {!error && rows !== null && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((r) => {
            const s = STATUS[r.review_status] ?? STATUS.queued;
            return (
              <Card as="li" key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-[0.95rem] font-semibold">
                    {r.locality || r.district || r.state}
                  </h2>
                  <span
                    className="rounded-full px-2.5 py-1 text-[0.7rem] font-semibold"
                    style={{
                      background: `var(--band-${s.token}-soft)`,
                      color: `var(--band-${s.token}-ink)`,
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                <p className="mt-1 text-[0.78rem] text-ink-3">
                  Logged {formatDateTime(r.created_at)} · promised{' '}
                  {formatDate(r.promised_on)}
                  {r.district ? ` · ${r.district}` : ''} · {r.state}
                </p>
                <p className="mt-1 text-[0.78rem] text-ink-3">{s.hint}</p>

                <ul className="mt-3 space-y-1 border-l pl-3">
                  {r.drafts.map((d, i) => (
                    <li key={i} className="text-[0.85rem]">
                      <span className="font-medium">{d.title}</span>
                      {d.deadlineLabel && (
                        <span className="text-ink-3"> — &ldquo;{d.deadlineLabel}&rdquo;</span>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.7rem] font-semibold text-ink-2">
                    {EVIDENCE_TIER_LABEL[r.evidence_tier] ?? 'Evidence'}
                  </span>
                  {r.receipt_media && r.receipt_media.length > 0 && (
                    <span className="text-[0.72rem] text-ink-3">
                      {r.receipt_media.length} file
                      {r.receipt_media.length === 1 ? '' : 's'} archived
                    </span>
                  )}
                  {r.source_url && (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-[0.72rem] font-semibold text-[var(--brand-ink)] hover:underline"
                    >
                      Source ↗
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-[0.82rem] text-ink-2">
        <Link href="/submit" className="font-semibold text-[var(--brand-ink)] hover:underline">
          Log another promise →
        </Link>
      </p>
    </div>
  );
}
