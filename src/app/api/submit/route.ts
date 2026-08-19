import { NextResponse } from 'next/server';
import { getSupabaseAsUser, tokenFromRequest } from '@/lib/supabase';
import {
  safeHttpUrl,
  safeHttpUrls,
  hasProof,
  NO_PROOF_MESSAGE,
  intakeFailure,
  bodyTooLarge,
  TOO_LARGE_MESSAGE,
  isRateLimited,
  RATE_LIMITED_MESSAGE,
} from '@/lib/intake';
import { slugify } from '@/lib/format';

/**
 * Intake for a whole post.
 *
 * Rows land in `submissions` with `review_status = 'queued'`, never directly in
 * `commitments`. The map is only worth reading because everything on it was
 * checked against a source by a second person, and an open endpoint that wrote
 * straight to the register would destroy exactly that.
 */

interface DraftIn {
  title?: unknown;
  detail?: unknown;
  deadline?: unknown;
  deadlineLabel?: unknown;
  category?: unknown;
  namedOfficials?: unknown;
}

export async function POST(request: Request) {
  // Checked before the body is touched: parsing is the expensive part.
  if (bodyTooLarge(request)) {
    return NextResponse.json({ ok: false, message: TOO_LARGE_MESSAGE }, { status: 413 });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    // JSON.parse('null') succeeds and returns null, and so does '"text"' and
    // '42'. Every field read below would then throw, and an unhandled throw is
    // a 500 — which tells anyone probing the endpoint that they have found
    // something worth pushing on. A non-object body is a client error, so it
    // leaves by the same 400 as any other malformed request.
    if (parsed === null || typeof parsed !== 'object') {
      throw new Error('Body is not a JSON object.');
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }

  const rawText = String(payload.rawText ?? '').trim();
  const state = String(payload.state ?? '').trim();
  const drafts = Array.isArray(payload.commitments) ? (payload.commitments as DraftIn[]) : [];

  if (rawText.length < 30) {
    return NextResponse.json(
      { ok: false, message: 'Paste the full post so the wording can be checked.' },
      { status: 400 },
    );
  }
  if (!state) {
    return NextResponse.json(
      { ok: false, message: 'Which state was this promised in?' },
      { status: 400 },
    );
  }
  if (drafts.length === 0) {
    return NextResponse.json(
      { ok: false, message: 'No commitments were selected.' },
      { status: 400 },
    );
  }

  const promisedOn = String(payload.promisedOn ?? new Date().toISOString());
  const district = String(payload.district ?? '').trim();

  const rows = drafts.slice(0, 25).map((d) => {
    const title = String(d.title ?? '').trim().slice(0, 160);
    return {
      title,
      slug: slugify(title).slice(0, 60),
      detail: String(d.detail ?? '').slice(0, 1200),
      deadline: d.deadline ? String(d.deadline) : null,
      deadline_label: d.deadlineLabel ? String(d.deadlineLabel) : null,
      category: String(d.category ?? 'governance'),
      named_officials: Array.isArray(d.namedOfficials)
        ? (d.namedOfficials as unknown[]).map(String)
        : [],
    };
  });

  if (rows.some((r) => r.title.length < 8)) {
    return NextResponse.json(
      { ok: false, message: 'One of the promises has no usable title.' },
      { status: 400 },
    );
  }

  const receipt = (payload.receipt ?? {}) as Record<string, unknown>;
  const receiptMedia = safeHttpUrls(receipt.mediaUrls, 12);
  const sourceUrl = safeHttpUrl(payload.sourceUrl);

  // The actual proof boundary. The form refuses to submit without evidence and
  // Postgres refuses to store a row without it, but this is the check that
  // stops somebody posting straight at the endpoint in between.
  if (!hasProof(receiptMedia, sourceUrl)) {
    return NextResponse.json({ ok: false, message: NO_PROOF_MESSAGE }, { status: 400 });
  }

  const logger = payload.loggedBy as { name?: unknown; email?: unknown } | null;
  const loggerEmail = logger?.email ? String(logger.email).trim().toLowerCase() : '';
  // A malformed address is dropped rather than rejecting the whole submission —
  // the promise is worth more than the subscription.
  const loggerValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(loggerEmail);

  const pincode = String(payload.pincode ?? '').trim();

  const submission = {
    source_url: sourceUrl,
    publisher: String(payload.publisher ?? 'Unattributed post').slice(0, 120),
    raw_text: rawText.slice(0, 8000),
    promised_on: promisedOn,
    state,
    state_slug: slugify(state),
    district: district || null,
    district_slug: district ? slugify(district) : null,
    subdistrict: String(payload.subdistrict ?? '').slice(0, 120) || null,
    village: String(payload.village ?? '').slice(0, 120) || null,
    school: String(payload.school ?? '').slice(0, 200) || null,
    udise: String(payload.udise ?? '').replace(/\D/g, '').slice(0, 11) || null,
    pincode: /^[1-9][0-9]{5}$/.test(pincode) ? pincode : null,
    locality: String(payload.locality ?? '').slice(0, 200),
    demanded_by: String(payload.demandedBy ?? '').slice(0, 200),
    handles: Array.isArray(payload.handles)
      ? (payload.handles as unknown[]).map(String).slice(0, 30)
      : [],
    receipt_kind: String(receipt.kind ?? 'social_post'),
    receipt_signed: Boolean(receipt.signed),
    receipt_media: receiptMedia,
    image_count: receiptMedia.length,
    logged_by_name: loggerValid ? String(logger?.name ?? 'Anonymous').slice(0, 80) : null,
    logged_by_email: loggerValid ? loggerEmail : null,
    drafts: rows,
    review_status: 'queued',
  };

  // Acts as the caller rather than as the anon key, so Postgres stamps
  // `user_id` from the verified token via the column default and the own-row
  // policies apply. A caller with no session still gets through; they simply
  // lose the ability to see their own submission later.
  const sb = getSupabaseAsUser(tokenFromRequest(request));
  if (!sb) {
    return NextResponse.json({
      ok: true,
      message: `${rows.length} promise${rows.length === 1 ? '' : 's'} parsed and validated, but no database is connected yet, so nothing was stored.`,
    });
  }

  const { error } = await sb.from('submissions').insert(submission);
  if (error) {
    return NextResponse.json(
      isRateLimited(error.message)
        ? { ok: false, message: RATE_LIMITED_MESSAGE }
        : { ok: false, message: intakeFailure('submit', error.message) },
      { status: isRateLimited(error.message) ? 429 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Queued ${rows.length} promise${rows.length === 1 ? '' : 's'} for review.`,
  });
}
