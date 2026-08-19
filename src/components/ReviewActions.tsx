'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Accept / reject for one queued submission.
 *
 * Accepting writes to `commitments`, so it deliberately asks twice: the first
 * press arms the button, the second commits. This is the one control in the
 * product that puts a claim about a named official onto a public map, and an
 * accidental click should not be able to do that.
 *
 * The token is the same shared secret already present in the page URL. Handing
 * it to the client changes nothing about the exposure, and it is the reason
 * `/review` is noindex and documented as needing real accounts before more
 * than a handful of people use it.
 */
export function ReviewActions({ id, token }: { id: string; token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [arming, setArming] = useState<'accept' | 'reject' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function decide(action: 'accept' | 'reject') {
    if (arming !== action) {
      setArming(action);
      setMsg(null);
      return;
    }
    setBusy(true);
    setArming(null);
    try {
      const res = await fetch('/api/review/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token, action }),
      });
      const body = (await res.json()) as { ok: boolean; message: string };
      setMsg({ ok: body.ok, text: body.message });
      // Pull the queue again so a decided row leaves the list immediately.
      if (body.ok) router.refresh();
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Request failed.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => decide('accept')}
        className="rounded-full px-3 py-1.5 text-[0.78rem] font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
        style={{ background: 'var(--band-kept)' }}
      >
        {arming === 'accept' ? 'Press again to publish' : 'Accept onto the register'}
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => decide('reject')}
        className="rounded-full border px-3 py-1.5 text-[0.78rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
      >
        {arming === 'reject' ? 'Press again to reject' : 'Reject'}
      </button>

      {arming && (
        <span className="text-[0.75rem] font-medium text-ink-3">
          {arming === 'accept'
            ? 'This puts it on the public map.'
            : 'This closes the row without publishing.'}
        </span>
      )}

      {msg && (
        <span
          role="status"
          className="text-[0.78rem] font-medium"
          style={{
            color: msg.ok ? 'var(--band-kept-ink)' : 'var(--band-broken-ink)',
          }}
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}
