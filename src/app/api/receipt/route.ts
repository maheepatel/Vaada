import { NextResponse } from 'next/server';
import { getSupabaseAsUser, tokenFromRequest } from '@/lib/supabase';
import { intakeFailure,
  bodyTooLarge,
  TOO_LARGE_MESSAGE,
  isRateLimited,
  RATE_LIMITED_MESSAGE,
} from '@/lib/intake';

const KINDS = new Set(['social_post', 'written_order', 'minutes', 'video', 'press_report']);

/**
 * Accepts proof that a promise was made.
 *
 * Everything lands `verified = false`, matching the RLS policy on the table.
 * A receipt is a claim about what an official said, so an open endpoint must
 * never be able to publish one as checked.
 */
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

  const commitmentId = String(payload.commitmentId ?? '').trim();
  const kind = String(payload.kind ?? '');
  const title = String(payload.title ?? '').trim();
  const quote = String(payload.quote ?? '').trim();
  const url = String(payload.url ?? '').trim();
  const documentDate = String(payload.documentDate ?? '').trim();
  const addedBy = String(payload.addedBy ?? 'Anonymous').slice(0, 80);
  const mediaUrls = Array.isArray(payload.mediaUrls)
    ? (payload.mediaUrls as unknown[]).map(String).slice(0, 8)
    : [];

  if (!commitmentId) {
    return NextResponse.json(
      { ok: false, message: 'Which promise is this about?' },
      { status: 400 },
    );
  }
  if (!KINDS.has(kind)) {
    return NextResponse.json({ ok: false, message: 'Unrecognised document type.' }, { status: 400 });
  }
  if (title.length < 8) {
    return NextResponse.json(
      { ok: false, message: 'Describe what the document is.' },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(documentDate)) {
    return NextResponse.json(
      { ok: false, message: 'Give the date on the document.' },
      { status: 400 },
    );
  }
  // Mirrors the database constraint: a receipt has to point at something, or it
  // is an assertion with nothing behind it.
  if (!url && mediaUrls.length === 0) {
    return NextResponse.json(
      { ok: false, message: 'Add a link or upload a file. A receipt needs something to show.' },
      { status: 400 },
    );
  }

  // Acts as the caller, so Postgres stamps `user_id` from the verified token.
  const sb = getSupabaseAsUser(tokenFromRequest(request));
  if (!sb) {
    return NextResponse.json({
      ok: true,
      message:
        'Checked and accepted, but no database is connected yet, so this was not stored.',
    });
  }

  const { error } = await sb.from('receipts').insert({
    commitment_id: commitmentId,
    kind,
    title,
    quote: quote || null,
    url: url || null,
    document_date: documentDate,
    signed: Boolean(payload.signed),
    media_urls: mediaUrls,
    added_by: addedBy,
    verified: false,
  });

  if (error) {
    return NextResponse.json(
      isRateLimited(error.message)
        ? { ok: false, message: RATE_LIMITED_MESSAGE }
        : { ok: false, message: intakeFailure('receipt', error.message) },
      { status: isRateLimited(error.message) ? 429 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Added. It will show as unchecked until a volunteer confirms it.',
  });
}
