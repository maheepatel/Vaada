import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase';
import {
  commitmentRowsFrom,
  receiptRowsFrom,
  type SubmissionRecord,
} from '@/lib/promote';

/**
 * Accept or reject one queued submission.
 *
 * This is the only path from the queue onto the public map, and it runs
 * exclusively on a human pressing a button. Nothing schedules it, the ingest
 * sweep cannot reach it, and it takes an explicit row id — there is no
 * "accept everything" and there should never be one.
 *
 * The service role is used because RLS forbids the anon key from writing to
 * `commitments` at all, which is the property that makes an openly
 * contributable register still worth citing.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Compared in constant time. The token is a shared secret in a query string —
 * already the thinnest part of this system — so at minimum it must not also
 * leak its own prefix to anyone willing to time a few hundred requests.
 */
function tokenMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.REVIEW_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: 'Review queue is not configured.' },
      { status: 503 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }

  const token = String(payload.token ?? '');
  if (!tokenMatches(token, expected)) {
    return NextResponse.json({ ok: false, message: 'Not authorised.' }, { status: 401 });
  }

  const id = String(payload.id ?? '').trim();
  const action = String(payload.action ?? '');
  const note = String(payload.note ?? '').slice(0, 500);

  if (!id) {
    return NextResponse.json({ ok: false, message: 'No row given.' }, { status: 400 });
  }
  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ ok: false, message: 'Unknown action.' }, { status: 400 });
  }

  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json(
      { ok: false, message: 'No database connected.' },
      { status: 503 },
    );
  }

  // Rejection is just a status change: the row stays in the queue table as a
  // record that somebody looked and said no. Nothing is deleted, so a decision
  // can always be audited afterwards.
  if (action === 'reject') {
    const { error } = await sb
      .from('submissions')
      .update({ review_status: 'rejected', reviewed_by: 'reviewer', review_note: note })
      .eq('id', id)
      .eq('review_status', 'queued');
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: 'Rejected.' });
  }

  const { data, error: readErr } = await sb
    .from('submissions')
    .select('*')
    .eq('id', id)
    .eq('review_status', 'queued')
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ ok: false, message: readErr.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, message: 'Already decided, or no such row.' },
      { status: 409 },
    );
  }

  const submission = data as unknown as SubmissionRecord;
  const rows = commitmentRowsFrom(submission, Date.now());

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, message: 'Nothing in this submission is usable as a commitment.' },
      { status: 422 },
    );
  }

  const { error: insertErr } = await sb.from('commitments').insert(rows);
  if (insertErr) {
    return NextResponse.json(
      { ok: false, message: `Could not add to the register: ${insertErr.message}` },
      { status: 500 },
    );
  }

  // Receipts second and non-fatally. The commitment is the record; losing the
  // archived copy is worth a warning, not a rollback that discards the promise.
  const receipts = receiptRowsFrom(submission, rows);
  let receiptNote = '';
  if (receipts.length > 0) {
    const { error: rErr } = await sb.from('receipts').insert(receipts);
    if (rErr) receiptNote = ` Receipts failed to attach: ${rErr.message}`;
  }

  const { error: markErr } = await sb
    .from('submissions')
    .update({ review_status: 'accepted', reviewed_by: 'reviewer', review_note: note })
    .eq('id', id);
  if (markErr) {
    return NextResponse.json(
      {
        ok: false,
        message: `Added ${rows.length} to the register, but the queue row could not be closed: ${markErr.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Added ${rows.length} promise${rows.length === 1 ? '' : 's'} to the register.${receiptNote}`,
  });
}
