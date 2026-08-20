'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase, ensureAnonSession, isSupabaseConfigured } from '@/lib/supabase';
import { EVIDENCE_TIER_LABEL, type EvidenceTier } from '@/lib/intake';
import { formatDate, formatDateTime } from '@/lib/format';
import { Card, Empty } from '@/components/ui';
import { toast } from '@/components/Toast';

/**
 * Everything this browser has logged.
 *
 * Client-side on purpose. The rows are readable only to the identity that
 * created them — the `read own submissions` policy compares `user_id` against
 * `auth.uid()` — so the query has to run where the session lives. There is no
 * server route to leak, and no reviewer-shaped endpoint to lock down: Postgres
 * simply returns nothing to anybody else.
 *
 * Editing and withdrawing go straight to PostgREST for the same reason. The
 * boundary is RLS plus a column grant, not this component, so a hand-written
 * request can do no more than these buttons can.
 */

interface Draft {
  title?: string;
  deadlineLabel?: string | null;
}

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
  drafts: Draft[];
}

const STATUS: Record<Row['review_status'], { label: string; hint: string; token: string }> = {
  queued: {
    label: 'Waiting for review',
    hint: 'A person reads the source before this reaches the map. You can still correct or withdraw it.',
    token: 'soon',
  },
  accepted: {
    label: 'On the register',
    hint: 'Checked and published. It can no longer be edited, because people cite what is on the map.',
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

  // Read during render, not in an effect. It depends on nothing but build-time
  // configuration, and setting state for it synchronously inside the effect is
  // exactly the cascading render React now warns about.
  const configured = isSupabaseConfigured();

  const load = useCallback(async () => {
    await ensureAnonSession();
    const sb = getBrowserSupabase();
    if (!sb) {
      setError('no-db');
      return;
    }
    const { data, error: err } = await sb
      .from('submissions')
      .select(
        'id,state,district,locality,promised_on,created_at,review_status,evidence_tier,source_url,receipt_media,drafts',
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (err) {
      setError(err.message);
    } else {
      setRows((data ?? []) as Row[]);
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    // Fetch on mount. The rule fires because `load` contains setState and it
    // cannot see that every one of those calls happens after an await — this
    // is not a synchronous cascade, it is the ordinary "subscribe to an
    // external system" case the rule's own documentation describes. The rows
    // live behind an auth session that only exists in the browser, so there is
    // no server component to move this into.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [configured, load]);

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

      {!configured && (
        <Card className="p-5">
          <p className="text-[0.95rem] font-semibold">No database connected.</p>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">
            Submissions are validated but not stored until Supabase is
            configured, so there is nothing to show here yet.
          </p>
        </Card>
      )}

      {configured && error && (
        <Card className="p-5">
          <p className="text-[0.95rem] font-semibold">Could not load your logs.</p>
          <p className="mt-2 text-[0.85rem] text-ink-2">{error}</p>
        </Card>
      )}

      {configured && !error && rows === null && <p className="text-[0.85rem] text-ink-3">Loading…</p>}

      {configured && !error && rows !== null && rows.length === 0 && (
        <Empty
          title="You have not logged anything yet."
          hint="Paste a post on the Log a promise page and it will appear here."
        />
      )}

      {configured && !error && rows !== null && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((r) => (
            <LogRow key={r.id} row={r} onChanged={load} />
          ))}
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

/**
 * One logged submission.
 *
 * Only the wording is editable, and only while the row is queued. The source,
 * the place and the evidence are exactly what a reviewer checks the claim
 * against, so letting an author change them after filing would hollow out the
 * review. Withdrawing arms on the first press and commits on the second.
 */
function LogRow({ row, onChanged }: { row: Row; onChanged: () => Promise<void> }) {
  const s = STATUS[row.review_status] ?? STATUS.queued;
  const editable = row.review_status === 'queued';

  const [editing, setEditing] = useState(false);
  const [titles, setTitles] = useState<string[]>(row.drafts.map((d) => d.title ?? ''));
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  async function save() {
    const cleaned = titles.map((t) => t.trim());
    if (cleaned.some((t) => t.length < 8)) {
      toast.error('Every promise needs a title of at least 8 characters.');
      return;
    }
    const sb = getBrowserSupabase();
    if (!sb) return;

    setBusy(true);
    const next = row.drafts.map((d, i) => ({ ...d, title: cleaned[i] }));
    // `.select()` matters. An update that RLS refuses is not an error — it
    // simply matches no rows and returns success with an empty result, so
    // without checking what came back this reported "Saved" over a write that
    // never happened. A false confirmation is worse than a visible failure.
    const { data, error } = await sb
      .from('submissions')
      .update({ drafts: next })
      .eq('id', row.id)
      .select('id');
    setBusy(false);

    if (error) {
      toast.error(`Could not save the change: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error(
        'Nothing was saved. This row can no longer be edited — a reviewer may have already accepted it.',
      );
      await onChanged();
      return;
    }
    toast.success('Saved. A reviewer will see the corrected wording.');
    setEditing(false);
    await onChanged();
  }

  async function withdraw() {
    if (!armed) {
      setArmed(true);
      return;
    }
    const sb = getBrowserSupabase();
    if (!sb) return;

    setBusy(true);
    const { data, error } = await sb
      .from('submissions')
      .delete()
      .eq('id', row.id)
      .select('id');
    setBusy(false);
    setArmed(false);

    if (error) {
      toast.error(`Could not withdraw it: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error(
        'Nothing was withdrawn. This row can no longer be removed — a reviewer may have already accepted it.',
      );
      await onChanged();
      return;
    }
    toast.success('Withdrawn. It has been taken out of the review queue.');
    await onChanged();
  }

  return (
    <Card as="li" className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-[0.95rem] font-semibold">
          {row.locality || row.district || row.state}
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
        Logged {formatDateTime(row.created_at)} · promised {formatDate(row.promised_on)}
        {row.district ? ` · ${row.district}` : ''} · {row.state}
      </p>
      <p className="mt-1 text-[0.78rem] text-ink-3">{s.hint}</p>

      {editing ? (
        <div className="mt-3 space-y-2">
          {titles.map((t, i) => (
            <input
              key={i}
              value={t}
              onChange={(e) =>
                setTitles((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
              }
              aria-label={`Promise ${i + 1} wording`}
              className="w-full rounded-lg border bg-surface-2 px-3 py-2 text-[0.88rem] text-ink outline-none focus:border-line-strong"
            />
          ))}
          <p className="text-[0.72rem] leading-relaxed text-ink-3">
            Only the wording can be changed. The source, the place and the
            evidence are what a reviewer checks the claim against, so those stay
            as filed.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-1 border-l pl-3">
          {row.drafts.map((d, i) => (
            <li key={i} className="text-[0.85rem]">
              <span className="font-medium">{d.title}</span>
              {d.deadlineLabel && (
                <span className="text-ink-3"> — &ldquo;{d.deadlineLabel}&rdquo;</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.7rem] font-semibold text-ink-2">
          {EVIDENCE_TIER_LABEL[row.evidence_tier] ?? 'Evidence'}
        </span>
        {row.receipt_media && row.receipt_media.length > 0 && (
          <span className="text-[0.72rem] text-ink-3">
            {row.receipt_media.length} file{row.receipt_media.length === 1 ? '' : 's'} archived
          </span>
        )}
        {row.source_url && (
          <a
            href={row.source_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[0.72rem] font-semibold text-[var(--brand-ink)] hover:underline"
          >
            Source ↗
          </a>
        )}
      </div>

      {/* The evidence itself, not a count of it. Somebody checking their own
          submission needs to see that the right photograph went up — "1 file
          archived" tells them a file exists, which is not the same thing and
          is exactly the case where a wrong or empty upload goes unnoticed. */}
      {row.receipt_media && row.receipt_media.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {row.receipt_media.map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt="Evidence you attached"
                loading="lazy"
                decoding="async"
                width={72}
                height={72}
                className="size-18 rounded-lg border object-cover transition-opacity hover:opacity-85"
              />
            </a>
          ))}
        </div>
      )}


      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          {editing ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={save}
                className="rounded-full bg-ink px-3 py-1.5 text-[0.78rem] font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
              >
                {busy ? 'Saving…' : 'Save wording'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setTitles(row.drafts.map((d) => d.title ?? ''));
                  setEditing(false);
                }}
                className="rounded-full border px-3 py-1.5 text-[0.78rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border px-3 py-1.5 text-[0.78rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Edit wording
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={withdraw}
            className="rounded-full px-3 py-1.5 text-[0.78rem] font-semibold transition-colors disabled:opacity-40"
            style={{
              background: armed ? 'var(--band-broken)' : 'transparent',
              color: armed ? '#fff' : 'var(--band-broken-ink)',
              border: `1px solid ${armed ? 'var(--band-broken)' : 'var(--line)'}`,
            }}
          >
            {armed ? 'Press again to withdraw' : 'Withdraw'}
          </button>

          {armed && (
            <span className="text-[0.73rem] text-ink-3">
              This takes it out of the queue for good.
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
