'use client';

import { useMemo, useState } from 'react';
import { CommitmentRow } from './CommitmentRow';
import { Empty } from './ui';
import { BAND_STYLE, CATEGORY_LABEL, byUrgency } from '@/lib/status';
import type { Category, LiveCommitment, UrgencyBand } from '@/lib/types';

type Sort = 'urgency' | 'deadline' | 'recent' | 'reach';

const BAND_ORDER: UrgencyBand[] = [
  'broken',
  'critical',
  'urgent',
  'soon',
  'fresh',
  'kept',
  'disputed',
  'undated',
  'unanswered',
];

/**
 * The full register with filters.
 *
 * Filtering happens on the client over the whole set rather than through the
 * URL and a round-trip, because the useful motion here is flicking between
 * "what is broken" and "what is undated" repeatedly — a 300ms navigation
 * between each one kills that.
 */
export function RegisterBrowser({
  commitments,
  initialBand,
}: {
  commitments: LiveCommitment[];
  initialBand?: UrgencyBand;
}) {
  const [q, setQ] = useState('');
  const [bands, setBands] = useState<Set<UrgencyBand>>(
    initialBand ? new Set([initialBand]) : new Set(),
  );
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [sort, setSort] = useState<Sort>('urgency');

  const bandCounts = useMemo(() => {
    const m = new Map<UrgencyBand, number>();
    for (const c of commitments) m.set(c.band, (m.get(c.band) ?? 0) + 1);
    return m;
  }, [commitments]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = commitments.filter((c) => {
      if (bands.size > 0 && !bands.has(c.band)) return false;
      if (cats.size > 0 && !cats.has(c.category)) return false;
      if (!needle) return true;
      return (
        c.title.toLowerCase().includes(needle) ||
        c.detail.toLowerCase().includes(needle) ||
        c.locality.toLowerCase().includes(needle) ||
        (c.district ?? '').toLowerCase().includes(needle) ||
        c.state.toLowerCase().includes(needle) ||
        c.accountable.some((o) => o.name.toLowerCase().includes(needle))
      );
    });

    switch (sort) {
      case 'deadline':
        return out.sort((a, b) => {
          if (a.msRemaining === null) return 1;
          if (b.msRemaining === null) return -1;
          return a.msRemaining - b.msRemaining;
        });
      case 'recent':
        return out.sort((a, b) => Date.parse(b.promisedOn) - Date.parse(a.promisedOn));
      case 'reach':
        return out.sort((a, b) => (b.beneficiaries ?? 0) - (a.beneficiaries ?? 0));
      default:
        return out.sort(byUrgency);
    }
  }, [commitments, q, bands, cats, sort]);

  function toggle<T>(set: Set<T>, value: T, apply: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  return (
    <>
      <div className="sticky top-14 z-30 -mx-4 mb-5 border-b bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a place, a promise or an official…"
            className="min-w-[16rem] flex-1 rounded-full border bg-surface px-4 py-2 text-[0.85rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border bg-surface px-3 py-2 text-[0.8rem] font-medium outline-none"
            aria-label="Sort order"
          >
            <option value="urgency">Most urgent first</option>
            <option value="deadline">Nearest deadline</option>
            <option value="recent">Most recently promised</option>
            <option value="reach">Most people affected</option>
          </select>
          {(bands.size > 0 || cats.size > 0 || q) && (
            <button
              onClick={() => {
                setBands(new Set());
                setCats(new Set());
                setQ('');
              }}
              className="rounded-full border px-3 py-2 text-[0.8rem] font-medium text-ink-3 hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {BAND_ORDER.filter((b) => bandCounts.has(b)).map((b) => {
            const s = BAND_STYLE[b];
            const on = bands.has(b);
            return (
              <button
                key={b}
                onClick={() => toggle(bands, b, setBands)}
                aria-pressed={on}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold transition-shadow"
                style={{
                  background: on ? s.fill : s.soft,
                  color: on ? s.on : s.softOn,
                }}
              >
                <span>{s.label}</span>
                <span className="tnum opacity-70">{bandCounts.get(b)}</span>
              </button>
            );
          })}
          <span className="mx-1 w-px self-stretch bg-[var(--line)]" aria-hidden />
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => {
            const on = cats.has(k);
            return (
              <button
                key={k}
                onClick={() => toggle(cats, k, setCats)}
                aria-pressed={on}
                className={`rounded-full px-2.5 py-1 text-[0.75rem] font-medium transition-colors ${
                  on ? 'bg-ink text-paper' : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
                }`}
              >
                {CATEGORY_LABEL[k]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mb-3 text-[0.8rem] text-ink-3">
        Showing {filtered.length} of {commitments.length}
      </p>

      {filtered.length === 0 ? (
        <Empty title="Nothing matches those filters." hint="Try clearing one of them." />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((c) => (
            <CommitmentRow key={c.id} c={c} />
          ))}
        </ul>
      )}
    </>
  );
}
