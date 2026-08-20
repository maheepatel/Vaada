'use client';

import { useState, type FormEvent } from 'react';
import { toastResult } from './Toast';
import { Card } from './ui';
import type { Watcher } from '@/lib/types';

const ROLES: { value: Watcher['role']; label: string }[] = [
  { value: 'follower', label: 'I want to keep track of this' },
  { value: 'logger', label: 'I logged this promise' },
  { value: 'journalist', label: 'Journalist' },
  { value: 'official', label: 'I work in the office responsible' },
];

/**
 * Subscribe to a promise's deadline.
 *
 * The offer is specific rather than a newsletter signup: two emails, one when
 * the deadline is close enough to still act on, one if it passes unmet. Saying
 * exactly that up front is why people give a real address.
 */
export function WatchForm({
  commitmentId,
  deadline,
}: {
  commitmentId: string;
  deadline: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Watcher['role']>('follower');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  // Every form reports the same way: the message stays on the page as a
  // record of what happened, and a toast announces it once. Sonner owns the
  // aria-live region, so the announcement is not duplicated by the inline copy.
  const report = (r: { ok: boolean; message: string } | null) => {
    setResult(r);
    if (r) toastResult(r);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    report(null);
    try {
      const res = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitmentId, email, name, role }),
      });
      const json = (await res.json()) as { ok: boolean; message: string };
      report(json);
      if (json.ok) setEmail('');
    } catch (err) {
      report({
        ok: false,
        message: err instanceof Error ? err.message : 'Could not subscribe.',
      });
    } finally {
      setBusy(false);
    }
  }

  // Nothing to alert on without a date. Saying so is more useful than a form
  // that would never fire.
  if (!deadline) {
    return (
      <Card className="p-4">
        <p className="eyebrow">No deadline to watch</p>
        <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-2">
          Nobody attached a date to this promise, so there is no moment at which
          it can be said to have been missed. That is the thing to press on
          first: ask the office named above for a completion date, and it becomes
          trackable.
        </p>
      </Card>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border bg-surface px-4 py-3.5 text-center text-[0.88rem] font-semibold transition-colors hover:border-line-strong"
      >
        Alert me when this deadline runs out
        <span className="mt-0.5 block text-[0.75rem] font-normal text-ink-3">
          Two emails: one before, one if it passes unmet
        </span>
      </button>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Watch this deadline</p>
            <h3 className="mt-1 text-[0.98rem] font-semibold leading-tight">
              You will get exactly two emails
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[0.78rem] text-ink-3 hover:text-ink"
          >
            Close
          </button>
        </div>

        <ul className="mt-2.5 space-y-1 text-[0.8rem] leading-relaxed text-ink-2">
          <li>· One shortly before the deadline, while there is still time to act.</li>
          <li>· One if it passes with no verified proof the work was done.</li>
        </ul>

        <label className="mt-4 block">
          <span className="eyebrow">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
          />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Name (optional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none focus:border-[var(--brand)]"
            />
          </label>
          <label className="block">
            <span className="eyebrow">You are</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Watcher['role'])}
              className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none focus:border-[var(--brand)]"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {busy ? 'Subscribing…' : 'Watch this deadline'}
          </button>
          {result && (
            <p
              role="status"
              className="text-[0.8rem] font-medium"
              style={{
                color: result.ok ? 'var(--band-kept-ink)' : 'var(--band-broken-ink)',
              }}
            >
              {result.message}
            </p>
          )}
        </div>

        <p className="mt-3 text-[0.7rem] leading-relaxed text-ink-3">
          Your address is used for these two notices and nothing else. It is
          never shown publicly, never passed to any official, and every message
          carries an unsubscribe link.
        </p>
      </form>
    </Card>
  );
}
