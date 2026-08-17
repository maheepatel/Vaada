'use client';

import { useState, type FormEvent } from 'react';
import { getSupabase, PROOF_BUCKET } from '@/lib/supabase';
import { isFragile, waybackSaveUrl } from '@/lib/archive';
import type { ReceiptKind } from '@/lib/types';

const KINDS: { value: ReceiptKind; label: string; hint: string }[] = [
  { value: 'social_post', label: 'Post', hint: 'A screenshot of a post on X, Facebook, Instagram or YouTube' },
  { value: 'written_order', label: 'Written order', hint: 'On letterhead, ideally signed or stamped' },
  { value: 'minutes', label: 'Minutes or memo', hint: 'A record made at the time by the people present' },
  { value: 'video', label: 'Video', hint: 'The official saying it, on camera' },
  { value: 'press_report', label: 'News report', hint: 'An article quoting the commitment' },
];

/**
 * Attaching proof that a promise was made.
 *
 * Separate from `ProofForm`, which is about whether the work got done. This is
 * the half that decides whether the entry survives being challenged, so the
 * form pushes hard for an uploaded image over a bare link: a deleted post takes
 * the evidence with it, and that is the moment somebody claims they never said
 * it.
 */
export function ReceiptForm({ commitmentId }: { commitmentId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReceiptKind>('social_post');
  const [title, setTitle] = useState('');
  const [quote, setQuote] = useState('');
  const [url, setUrl] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [signed, setSigned] = useState(false);
  const [addedBy, setAddedBy] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fragileLink = url.trim().length > 0 && isFragile(url);
  const noArchive = files.length === 0;

  async function upload(): Promise<string[]> {
    const sb = getSupabase();
    if (!sb || files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      const path = `receipts/${commitmentId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await sb.storage.from(PROOF_BUCKET).upload(path, file);
      if (error) throw new Error(`Upload failed: ${error.message}`);
      urls.push(sb.storage.from(PROOF_BUCKET).getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const mediaUrls = await upload();
      const res = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentId,
          kind,
          title,
          quote,
          url: url.trim(),
          documentDate,
          signed,
          addedBy: addedBy.trim() || 'Anonymous',
          mediaUrls,
        }),
      });
      const json = (await res.json()) as { ok: boolean; message: string };
      setResult(json);
      if (json.ok) {
        setTitle('');
        setQuote('');
        setUrl('');
        setFiles([]);
      }
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Could not add the receipt.',
      });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed bg-surface-2 px-4 py-3.5 text-center text-[0.86rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      >
        + Add proof this was promised
        <span className="mt-0.5 block text-[0.74rem] font-normal text-ink-3">
          A screenshot, a signed order, or a link to the report
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Add a receipt</p>
          <h3 className="mt-1 text-[1.02rem] font-semibold leading-tight">
            Show that this was actually promised
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

      <fieldset className="mt-4">
        <legend className="eyebrow mb-2">What kind of document is it?</legend>
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
                name="receiptKind"
                className="sr-only"
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
              />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className="eyebrow">What is it?</span>
        <input
          required
          minLength={8}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Signed undertaking from the Block Education Officer"
          className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
        />
      </label>

      <label className="mt-3 block">
        <span className="eyebrow">The exact words of the promise</span>
        <textarea
          rows={2}
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="“All classrooms will be repaired within one week.”"
          className="mt-1.5 w-full resize-y rounded-lg border bg-paper px-3 py-2 text-[0.88rem] leading-relaxed outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
        />
        <span className="mt-1 block text-[0.7rem] text-ink-3">
          Copy the wording, do not summarise it. The precise phrase is what gets
          argued about later.
        </span>
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Link to the original</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Date on the document</span>
          <input
            type="date"
            required
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none focus:border-[var(--brand)]"
          />
        </label>
      </div>

      {fragileLink && (
        <p
          className="mt-2 rounded-lg px-3 py-2 text-[0.76rem] leading-relaxed"
          style={{
            background: 'var(--band-urgent-soft)',
            color: 'var(--band-urgent-ink)',
          }}
        >
          That is a social media link, which one delete would erase. Upload a
          screenshot below, and consider{' '}
          <a
            href={waybackSaveUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            saving it to the Internet Archive
          </a>{' '}
          as well. Both take seconds and make the entry permanent.
        </p>
      )}

      <label className="mt-3 flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={signed}
          onChange={(e) => setSigned(e.target.checked)}
          className="mt-0.5 size-4 shrink-0"
        />
        <span className="text-[0.83rem] leading-snug">
          It carries a signature, seal or letterhead
          <span className="block text-[0.72rem] text-ink-3">
            The strongest thing this register can hold.
          </span>
        </span>
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Screenshot or scan</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => setFiles([...(e.target.files ?? [])])}
            className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.8rem] file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-2.5 file:py-1 file:text-[0.76rem] file:font-medium"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Your name or handle</span>
          <input
            value={addedBy}
            onChange={(e) => setAddedBy(e.target.value)}
            placeholder="Optional"
            className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
          />
        </label>
      </div>

      {noArchive && (
        <p className="mt-2 text-[0.73rem] leading-relaxed text-ink-3">
          Nothing attached yet. A link alone is fragile; an uploaded image is
          what makes this entry stand up if the original disappears.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {busy ? 'Adding…' : 'Add receipt'}
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
        Receipts are published unverified and marked as such until a volunteer
        checks them against the source. Do not upload a child&rsquo;s face or
        anyone&rsquo;s contact details.
      </p>
    </form>
  );
}
