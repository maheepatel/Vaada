'use client';

import { useState, type FormEvent } from 'react';
import { getSupabase, PROOF_BUCKET } from '@/lib/supabase';
import { CATEGORY_LABEL } from '@/lib/status';
import { Card } from './ui';
import type { Category } from '@/lib/types';

export interface CommitmentOption {
  id: string;
  slug: string;
  title: string;
  place: string;
  stateSlug: string;
  districtSlug: string | null;
}

/**
 * Complaint intake.
 *
 * A complaint can hang off a specific commitment or stand on its own, because
 * the most important complaints are usually about the thing nobody has
 * promised anything about yet.
 */
export function ComplaintForm({
  options,
  preselect,
}: {
  options: CommitmentOption[];
  preselect?: string;
}) {
  const initial = options.find((o) => o.slug === preselect);

  const [commitmentId, setCommitmentId] = useState(initial?.id ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category>('education');
  const [stateSlug, setStateSlug] = useState(initial?.stateSlug ?? '');
  const [districtSlug, setDistrictSlug] = useState(initial?.districtSlug ?? '');
  const [filedBy, setFiledBy] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function onPickCommitment(id: string) {
    setCommitmentId(id);
    const o = options.find((x) => x.id === id);
    if (o) {
      setStateSlug(o.stateSlug);
      setDistrictSlug(o.districtSlug ?? '');
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const sb = getSupabase();
      const mediaUrls: string[] = [];
      if (sb) {
        for (const file of files) {
          const path = `complaints/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
          const { error } = await sb.storage.from(PROOF_BUCKET).upload(path, file);
          if (error) throw new Error(`Upload failed: ${error.message}`);
          mediaUrls.push(sb.storage.from(PROOF_BUCKET).getPublicUrl(path).data.publicUrl);
        }
      }

      const res = await fetch('/api/complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentId: commitmentId || null,
          title,
          body,
          category,
          stateSlug,
          districtSlug: districtSlug || null,
          filedBy: filedBy.trim() || 'Anonymous',
          mediaUrls,
        }),
      });
      const json = (await res.json()) as { ok: boolean; message: string };
      setResult(json);
      if (json.ok) {
        setTitle('');
        setBody('');
        setFiles([]);
      }
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Could not file the complaint.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="p-4 sm:p-5">
        <p className="eyebrow">Is this about a promise already on the register?</p>
        <select
          value={commitmentId}
          onChange={(e) => onPickCommitment(e.target.value)}
          className="mt-2 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none focus:border-[var(--brand)]"
        >
          <option value="">No, this is something new</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title} · {o.place}
            </option>
          ))}
        </select>
      </Card>

      <Card className="space-y-4 p-4 sm:p-5">
        <label className="block">
          <span className="eyebrow">One line: what is wrong?</span>
          <input
            required
            minLength={10}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Toilets were locked instead of repaired"
            className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
          />
        </label>

        <label className="block">
          <span className="eyebrow">What exactly happened?</span>
          <textarea
            required
            minLength={30}
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dates, what you saw, who you spoke to, and what you were told. The more checkable this is, the harder it is to ignore."
            className="mt-1.5 w-full resize-y rounded-lg border bg-paper px-3 py-2 text-[0.88rem] leading-relaxed outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="eyebrow">About</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none focus:border-[var(--brand)]"
            >
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
                <option key={k} value={k}>
                  {CATEGORY_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow">State</span>
            <input
              required
              value={stateSlug}
              onChange={(e) => setStateSlug(e.target.value)}
              placeholder="rajasthan"
              className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
            />
          </label>
          <label className="block">
            <span className="eyebrow">District</span>
            <input
              value={districtSlug}
              onChange={(e) => setDistrictSlug(e.target.value)}
              placeholder="alwar"
              className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Your name or group</span>
            <input
              value={filedBy}
              onChange={(e) => setFiledBy(e.target.value)}
              placeholder="Optional"
              className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.88rem] outline-none placeholder:text-ink-4 focus:border-[var(--brand)]"
            />
          </label>
          <label className="block">
            <span className="eyebrow">Photos, if you have them</span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => setFiles([...(e.target.files ?? [])])}
              className="mt-1.5 w-full rounded-lg border bg-paper px-3 py-2 text-[0.82rem] file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-2.5 file:py-1 file:text-[0.78rem] file:font-medium"
            />
          </label>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {busy ? 'Filing…' : 'File complaint'}
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
          Complaints are published with the name you give and the place, but never
          with contact details. Do not name a child, and do not include anyone&rsquo;s
          phone number or address.
        </p>
      </Card>
    </form>
  );
}
