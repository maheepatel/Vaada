'use client';

import { useState, type FormEvent } from 'react';
import { toastResult } from './Toast';
import { getBrowserSupabase, ensureAnonSession, PROOF_BUCKET } from '@/lib/supabase';
import type { ProofKind, Proof } from '@/lib/types';

const KINDS: { value: ProofKind; label: string; hint: string }[] = [
  { value: 'photo', label: 'Photo', hint: 'A picture of the site as it is today' },
  { value: 'video', label: 'Video', hint: 'Walk-through or clip' },
  { value: 'document', label: 'Document', hint: 'Order, notice, register, bill' },
  { value: 'measurement', label: 'Measurement', hint: 'Counts, dimensions, attendance' },
  { value: 'testimony', label: 'Testimony', hint: 'What you saw, in your own words' },
];

const WHO: { value: Proof['submitterKind']; label: string }[] = [
  { value: 'resident', label: 'I live here' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'journalist', label: 'Journalist' },
  { value: 'official', label: 'Official / staff' },
  { value: 'anonymous', label: 'Prefer not to say' },
];

/**
 * Citizen evidence submission.
 *
 * Two things make this worth trusting: the submitter has to say whether their
 * evidence *supports* or *refutes* the claim that the work was done, and they
 * have to say who they are relative to the place. Both are asked before the
 * upload, because after choosing a file people stop reading.
 */
export function ProofForm({
  commitmentId,
  commitmentTitle,
}: {
  commitmentId: string;
  commitmentTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ProofKind>('photo');
  const [direction, setDirection] = useState<'supports' | 'refutes'>('refutes');
  const [claim, setClaim] = useState('');
  const [name, setName] = useState('');
  const [who, setWho] = useState<Proof['submitterKind']>('resident');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  // Every form reports the same way: the message stays on the page as a
  // record of what happened, and a toast announces it once. Sonner owns the
  // aria-live region, so the announcement is not duplicated by the inline copy.
  const report = (r: { ok: boolean; message: string } | null) => {
    setResult(r);
    if (r) toastResult(r);
  };

  async function uploadFiles(): Promise<string[]> {
    const sb = getBrowserSupabase();
    if (!sb || files.length === 0) return [];
    await ensureAnonSession();
    const urls: string[] = [];
    for (const file of files) {
      const path = `${commitmentId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await sb.storage.from(PROOF_BUCKET).upload(path, file);
      if (error) throw new Error(`Upload failed: ${error.message}`);
      urls.push(sb.storage.from(PROOF_BUCKET).getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    report(null);
    try {
      const mediaUrls = await uploadFiles();
      const res = await fetch('/api/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentId,
          kind,
          direction,
          claim,
          submittedBy: name.trim() || 'Anonymous',
          submitterKind: who,
          mediaUrls,
        }),
      });
      const json = (await res.json()) as { ok: boolean; message: string };
      report(json);
      if (json.ok) {
        setClaim('');
        setFiles([]);
      }
    } catch (err) {
      report({
        ok: false,
        message: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed bg-surface-2 px-4 py-4 text-center text-[0.88rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      >
        + Send evidence from the ground
        <span className="mt-0.5 block text-[0.75rem] font-normal text-ink-3">
          A photo taken today is worth more than any official statement
        </span>
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border bg-surface p-4 sm:p-5"
      aria-label={`Submit evidence about: ${commitmentTitle}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Send evidence</p>
          <h3 className="mt-1 text-[1.05rem] font-semibold leading-tight">
            What does it look like on the ground?
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

      <fieldset className="mt-5">
        <legend className="eyebrow mb-2">Does your evidence show the work was done?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: 'supports', label: 'Yes, it was done', tone: 'var(--band-kept)' },
              { v: 'refutes', label: 'No, it was not', tone: 'var(--band-broken)' },
            ] as const
          ).map((opt) => (
            <label
              key={opt.v}
              className={`cursor-pointer rounded-lg border-2 px-3 py-2.5 text-[0.85rem] font-semibold transition-colors ${
                direction === opt.v ? 'bg-surface-2' : 'border-transparent bg-surface-2/50'
              }`}
              style={direction === opt.v ? { borderColor: opt.tone } : undefined}
            >
              <input
                type="radio"
                name="direction"
                className="sr-only"
                checked={direction === opt.v}
                onChange={() => setDirection(opt.v)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="eyebrow mb-2">Kind of evidence</legend>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <label
              key={k.value}
              title={k.hint}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-[0.78rem] font-medium transition-colors ${
                kind === k.value
                  ? 'bg-ink text-paper'
                  : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
              }`}
            >
              <input
                type="radio"
                name="kind"
                className="sr-only"
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
              />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 block">
        <span className="eyebrow">What does it show?</span>
        <textarea
          required
          minLength={15}
          rows={3}
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder="Be specific: what, where exactly, and when you saw it. “Two classrooms on the east side still have the cracked beams, photographed 15 Aug at 11am.”"
          className="mt-1.5 w-full resize-y rounded-lg border bg-paper px-3 py-2 text-[0.88rem] leading-relaxed outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
        />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Your name or handle</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
            className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Your connection to this place</span>
          <select
            value={who}
            onChange={(e) => setWho(e.target.value as Proof['submitterKind'])}
            className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none focus:border-[var(--brand)]"
          >
            {WHO.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="eyebrow">Attach photos or documents</span>
        <input
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          onChange={(e) => setFiles([...(e.target.files ?? [])])}
          className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.82rem] file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-2.5 file:py-1 file:text-[0.78rem] file:font-medium"
        />
        {files.length > 0 && (
          <span className="mt-1 block text-[0.72rem] text-ink-3">
            {files.length} file{files.length === 1 ? '' : 's'} selected
          </span>
        )}
      </label>

      <p className="mt-4 text-[0.72rem] leading-relaxed text-ink-3">
        Submissions are held as <strong>pending</strong> until a volunteer checks
        them against the site. Nothing you send changes a tile&rsquo;s colour on its
        own. Do not include anyone&rsquo;s phone number, address or a child&rsquo;s face.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Submit evidence'}
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
    </form>
  );
}
