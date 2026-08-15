'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { extractCommitments, type ExtractedCommitment } from '@/lib/extract';
import { formatDate, roughDuration } from '@/lib/format';
import { CATEGORY_LABEL } from '@/lib/status';
import { Card } from './ui';
import { PlacePicker } from './PlacePicker';
import { EMPTY_PLACE, localityFrom, type PlaceValue } from '@/lib/geo';
import { getSupabase, PROOF_BUCKET } from '@/lib/supabase';
import type { Category, ReceiptKind } from '@/lib/types';

const RECEIPT_KINDS: { value: ReceiptKind; label: string; hint: string }[] = [
  { value: 'social_post', label: 'Social media post', hint: 'A post on X, Facebook, Instagram or YouTube' },
  { value: 'written_order', label: 'Written order or letter', hint: 'On letterhead, ideally signed or sealed' },
  { value: 'minutes', label: 'Minutes or memorandum', hint: 'A record made at the time by the parties present' },
  { value: 'video', label: 'Video', hint: 'The official saying it, on camera' },
  { value: 'press_report', label: 'Press report', hint: 'A news article quoting the commitment' },
];

const EXAMPLE = `GenAlpha's enthusiasm. CJP's fear.

After a five-hour sit-in protest, the Rajasthan government has accepted all demands.

In Jodhawas, Thanagazi, all classrooms will be repaired within one week and used exclusively for children. And seven rooms will be prepared in the next three months.

The road for commuting will be ready in the next 48 hours. And a playground will be built for the children.

Madan Dilawar ji, get all the dilapidated schools fixed within three months. Otherwise, your chair will be in danger.

@Cockroachisback @abhijeet_dipke @deepakbaliyan90`;

/**
 * Paste-a-post intake.
 *
 * Everything is one submission: the post text, its URL, the images, the place.
 * The extractor drafts the rows live as you type, and each drafted row is
 * editable before it is sent — the machine guesses, a person signs it off.
 */
export function SubmitForm() {
  const [text, setText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [publisher, setPublisher] = useState('');
  const [promisedOn, setPromisedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [place, setPlace] = useState<PlaceValue>(EMPTY_PLACE);
  const [demandedBy, setDemandedBy] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [receiptKind, setReceiptKind] = useState<ReceiptKind>('social_post');
  const [receiptSigned, setReceiptSigned] = useState(false);
  const [loggerEmail, setLoggerEmail] = useState('');
  const [loggerName, setLoggerName] = useState('');
  const [edits, setEdits] = useState<Record<number, Partial<ExtractedCommitment>>>({});
  const [dropped, setDropped] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Captured once at mount. Deadlines are offsets from the promise date, so
  // this only has to stand in when the date field is mid-edit and unparseable —
  // and it must not change on every render, or every draft row's computed
  // deadline would drift while you type.
  const [mountedAt] = useState(() => Date.now());

  const baseTime = useMemo(() => {
    const t = Date.parse(`${promisedOn}T12:00:00+05:30`);
    return Number.isFinite(t) ? t : mountedAt;
  }, [promisedOn, mountedAt]);

  const extraction = useMemo(
    () => extractCommitments(text, baseTime),
    [text, baseTime],
  );

  const rows = extraction.commitments.map((c, i) => ({ ...c, ...edits[i] }));
  const kept = rows.filter((_, i) => !dropped.has(i));

  function patch(i: number, p: Partial<ExtractedCommitment>) {
    setEdits((prev) => ({ ...prev, [i]: { ...prev[i], ...p } }));
  }

  /**
   * Uploads the screenshots before the row is queued.
   *
   * Done first, and blocking, on purpose: the images are the durable part of a
   * receipt, and queueing a submission that references uploads which then fail
   * would leave a row claiming evidence it does not have.
   */
  async function uploadReceiptMedia(): Promise<string[]> {
    const sb = getSupabase();
    if (!sb || files.length === 0) return [];
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const path = `receipts/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const { error } = await sb.storage.from(PROOF_BUCKET).upload(path, file);
        if (error) throw new Error(`Upload failed: ${error.message}`);
        urls.push(sb.storage.from(PROOF_BUCKET).getPublicUrl(path).data.publicUrl);
      }
      return urls;
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const mediaUrls = await uploadReceiptMedia();
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl,
          publisher: publisher.trim() || 'Unattributed post',
          rawText: text,
          promisedOn: `${promisedOn}T12:00:00+05:30`,
          state: place.state,
          district: place.district,
          subdistrict: place.subdistrict,
          village: place.village,
          school: place.school,
          udise: place.udise,
          pincode: place.pincode,
          locality: localityFrom(place),
          demandedBy,
          handles: extraction.handles,
          receipt: {
            kind: receiptKind,
            signed: receiptSigned,
            url: sourceUrl,
            mediaUrls,
          },
          loggedBy: loggerEmail.trim()
            ? { name: loggerName.trim() || 'Anonymous', email: loggerEmail.trim(), role: 'logger' }
            : null,
          commitments: kept,
        }),
      });
      setResult((await res.json()) as { ok: boolean; message: string });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Submission failed.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* ---- Left: the raw post ---- */}
      <div className="space-y-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Step 1</p>
              <h2 className="mt-1 text-[1.05rem] font-semibold">Paste the whole post</h2>
            </div>
            <button
              type="button"
              onClick={() => setText(EXAMPLE)}
              className="rounded-full border px-2.5 py-1 text-[0.75rem] font-medium text-ink-2 hover:border-line-strong hover:text-ink"
            >
              Use the example
            </button>
          </div>
          <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-3">
            Everything in one go — the text, the tagged handles, the link, the
            photos. Sentences that contain a commitment are pulled out on the right
            as you type.
          </p>
          <textarea
            required
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the tweet or post here…"
            className="mt-3 w-full resize-y rounded-lg border bg-paper px-3 py-2.5 font-mono text-[0.83rem] leading-relaxed outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
          />

          {(extraction.handles.length > 0 || extraction.urls.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {extraction.handles.map((h) => (
                <span
                  key={h}
                  className="rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[0.72rem] font-medium text-[var(--brand-ink)]"
                >
                  {h}
                </span>
              ))}
              {extraction.urls.map((u) => (
                <span
                  key={u}
                  className="max-w-[14rem] truncate rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[0.72rem] text-ink-3"
                >
                  {u}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="eyebrow">Step 2</p>
          <h2 className="mt-1 text-[1.05rem] font-semibold">Exactly where</h2>
          <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-3">
            Each field narrows the next. Anything not in our lists can still be
            typed in — the lists exist to keep spellings consistent, not to
            refuse places we have not heard of.
          </p>
          <div className="mt-4">
            <PlacePicker value={place} onChange={setPlace} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow">Date promised</span>
              <input
                type="date"
                required
                value={promisedOn}
                onChange={(e) => setPromisedOn(e.target.value)}
                className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none focus:border-[var(--brand)]"
              />
              <span className="mt-1 block text-[0.7rem] text-ink-3">
                Every deadline below is counted from this date.
              </span>
            </label>
            <Field
              label="Who forced it"
              value={demandedBy}
              onChange={setDemandedBy}
              placeholder="Students and parents of…"
            />
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="eyebrow">Step 3</p>
          <h2 className="mt-1 text-[1.05rem] font-semibold">The receipt</h2>
          <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-3">
            Proof the promise was <em>made</em>. This is the half officials
            contest first, so a screenshot matters more than a link — if the post
            comes down, a link proves nothing.
          </p>

          <fieldset className="mt-4">
            <legend className="eyebrow mb-2">What kind of document is it?</legend>
            <div className="flex flex-wrap gap-1.5">
              {RECEIPT_KINDS.map((k) => (
                <label
                  key={k.value}
                  title={k.hint}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-[0.78rem] font-medium transition-colors ${
                    receiptKind === k.value
                      ? 'bg-ink text-paper'
                      : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
                  }`}
                >
                  <input
                    type="radio"
                    name="receiptKind"
                    className="sr-only"
                    checked={receiptKind === k.value}
                    onChange={() => setReceiptKind(k.value)}
                  />
                  {k.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={receiptSigned}
              onChange={(e) => setReceiptSigned(e.target.checked)}
              className="mt-0.5 size-4 shrink-0"
            />
            <span className="text-[0.83rem] leading-snug">
              It carries a signature, seal or letterhead
              <span className="block text-[0.73rem] text-ink-3">
                A signed order is the strongest thing this register can hold.
              </span>
            </span>
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="Source account or outlet"
              value={publisher}
              onChange={setPublisher}
              placeholder="@AshutoshRanka"
            />
            <label className="block">
              <span className="eyebrow">Link to the original</span>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://x.com/…"
                className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="eyebrow">
              Screenshots, scans or photos of the document
            </span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => setFiles([...(e.target.files ?? [])])}
              className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.82rem] file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-2.5 file:py-1 file:text-[0.78rem] file:font-medium"
            />
            {files.length > 0 ? (
              <span className="mt-1 block text-[0.72rem] text-ink-3">
                {files.length} file{files.length === 1 ? '' : 's'} — these become
                the permanent record.
              </span>
            ) : (
              <span
                className="mt-1.5 block rounded px-2 py-1.5 text-[0.73rem] leading-snug"
                style={{
                  background: 'var(--band-urgent-soft)',
                  color: 'var(--band-urgent-ink)',
                }}
              >
                Nothing attached. A link alone is fragile — if the post is
                deleted, this entry can no longer show what was promised.
              </span>
            )}
          </label>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="eyebrow">Step 4</p>
          <h2 className="mt-1 text-[1.05rem] font-semibold">
            Should we tell you when it breaks?
          </h2>
          <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-3">
            Optional. If you leave an address you get two emails about these
            promises and nothing else: one shortly before each deadline, one if
            it passes with no verified proof the work was done.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              label="Your name"
              value={loggerName}
              onChange={setLoggerName}
              placeholder="Optional"
            />
            <label className="block">
              <span className="eyebrow">Your email</span>
              <input
                type="email"
                value={loggerEmail}
                onChange={(e) => setLoggerEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
              />
            </label>
          </div>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-ink-3">
            Never shown publicly and never given to any official.
          </p>
        </Card>
      </div>

      {/* ---- Right: the drafted rows ---- */}
      <div className="space-y-4">
        <Card className="p-4 sm:p-5">
          <p className="eyebrow">What the parser found</p>
          <h2 className="mt-1 text-[1.05rem] font-semibold">
            {kept.length > 0
              ? `${kept.length} promise${kept.length === 1 ? '' : 's'} found`
              : 'Nothing found yet'}
          </h2>
          <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-3">
            Each of these becomes its own tile with its own clock. Fix anything the
            parser got wrong, and drop the ones that are not really commitments.
          </p>

          {rows.length === 0 && text.length > 0 && (
            <p className="mt-4 rounded-lg border border-dashed bg-surface-2 px-4 py-6 text-center text-[0.83rem] text-ink-3">
              No sentence in this post reads as a commitment. Look for phrasing
              like &ldquo;will be&rdquo;, &ldquo;within&rdquo;, &ldquo;assured&rdquo;
              — or add the promise by hand once you have the wording.
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {rows.map((row, i) => (
              <DraftRow
                key={i}
                row={row}
                dropped={dropped.has(i)}
                onToggle={() =>
                  setDropped((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  })
                }
                onPatch={(p) => patch(i, p)}
                baseTime={baseTime}
              />
            ))}
          </ul>

          {extraction.ignored.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-[0.78rem] font-medium text-ink-3 hover:text-ink">
                {extraction.ignored.length} line
                {extraction.ignored.length === 1 ? '' : 's'} skipped as context
              </summary>
              <ul className="mt-2 space-y-1 border-l pl-3">
                {extraction.ignored.map((s, i) => (
                  <li key={i} className="text-[0.78rem] leading-relaxed text-ink-3">
                    {s}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || kept.length === 0 || !place.state}
              className="rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {uploading
                ? 'Uploading evidence…'
                : busy
                  ? 'Submitting…'
                  : `Submit ${kept.length} promise${kept.length === 1 ? '' : 's'}`}
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
          <p className="mt-3 text-[0.72rem] leading-relaxed text-ink-3">
            Submissions go into a review queue. A promise only appears on the map
            once a second person has checked it against the source, because a
            register anyone can write to without review is not evidence of
            anything.
          </p>
        </Card>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
      />
    </label>
  );
}

const CONFIDENCE_TONE = {
  high: 'var(--band-kept)',
  medium: 'var(--band-soon)',
  low: 'var(--band-undated)',
} as const;

function DraftRow({
  row,
  dropped,
  onToggle,
  onPatch,
  baseTime,
}: {
  row: ExtractedCommitment;
  dropped: boolean;
  onToggle: () => void;
  onPatch: (p: Partial<ExtractedCommitment>) => void;
  baseTime: number;
}) {
  const windowMs = row.deadline ? Date.parse(row.deadline) - baseTime : null;

  return (
    <li
      className={`rounded-lg border p-3 transition-opacity ${dropped ? 'opacity-40' : ''}`}
      style={{ borderLeftWidth: 3, borderLeftColor: CONFIDENCE_TONE[row.confidence] }}
    >
      <div className="flex items-start gap-2">
        <input
          value={row.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          disabled={dropped}
          className="min-w-0 flex-1 rounded border-transparent bg-transparent px-1 py-0.5 text-[0.88rem] font-semibold outline-none focus:border focus:bg-paper"
        />
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium text-ink-3 hover:text-ink"
        >
          {dropped ? 'restore' : 'drop'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.73rem]">
        <select
          value={row.category}
          onChange={(e) => onPatch({ category: e.target.value as Category })}
          disabled={dropped}
          className="rounded border bg-paper px-1.5 py-0.5 text-[0.73rem] outline-none"
        >
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
            <option key={k} value={k}>
              {CATEGORY_LABEL[k]}
            </option>
          ))}
        </select>

        {row.deadlineLabel ? (
          <span className="font-medium text-ink-2">
            “{row.deadlineLabel}” → {formatDate(row.deadline)}
            {windowMs !== null && windowMs > 0 && (
              <span className="text-ink-3"> ({roughDuration(windowMs)})</span>
            )}
          </span>
        ) : (
          <span
            className="rounded px-1.5 py-0.5 font-medium"
            style={{
              background: 'var(--band-undated-soft)',
              color: 'var(--band-undated-ink)',
            }}
          >
            no deadline in the text — will be logged as undated
          </span>
        )}

        {row.namedOfficials.map((n) => (
          <span
            key={n}
            className="rounded bg-surface-2 px-1.5 py-0.5 font-medium text-ink-2"
          >
            {n}
          </span>
        ))}
      </div>
    </li>
  );
}
