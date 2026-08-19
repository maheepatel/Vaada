import { NextResponse } from 'next/server';
import { getSupabaseAsUser, tokenFromRequest } from '@/lib/supabase';
import { intakeFailure,
  bodyTooLarge,
  TOO_LARGE_MESSAGE,
  isRateLimited,
  RATE_LIMITED_MESSAGE,
} from '@/lib/intake';

/**
 * Accepts citizen evidence.
 *
 * Everything lands as `pending`. The API cannot set a verdict and cannot touch
 * `progress` — a tile only changes because a reviewer accepted something, so an
 * open write endpoint can never repaint the map on its own.
 */

const KINDS = new Set(['photo', 'video', 'document', 'measurement', 'testimony']);
const WHO = new Set(['resident', 'volunteer', 'journalist', 'official', 'anonymous']);

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
  const claim = String(payload.claim ?? '').trim();
  const kind = String(payload.kind ?? '');
  const direction = String(payload.direction ?? '');
  const submitterKind = String(payload.submitterKind ?? 'anonymous');
  const submittedBy = String(payload.submittedBy ?? 'Anonymous').slice(0, 80);
  const mediaUrls = Array.isArray(payload.mediaUrls)
    ? (payload.mediaUrls as unknown[]).map(String).slice(0, 8)
    : [];

  if (!commitmentId) {
    return NextResponse.json(
      { ok: false, message: 'Which promise is this about?' },
      { status: 400 },
    );
  }
  if (claim.length < 15) {
    return NextResponse.json(
      { ok: false, message: 'Say a bit more about what the evidence shows.' },
      { status: 400 },
    );
  }
  if (!KINDS.has(kind) || !WHO.has(submitterKind)) {
    return NextResponse.json(
      { ok: false, message: 'Unrecognised evidence type.' },
      { status: 400 },
    );
  }
  if (direction !== 'supports' && direction !== 'refutes') {
    return NextResponse.json(
      { ok: false, message: 'Say whether this shows the work was done or not.' },
      { status: 400 },
    );
  }

  // Acts as the caller, so Postgres stamps `user_id` from the verified token.
  const sb = getSupabaseAsUser(tokenFromRequest(request));
  if (!sb) {
    // Validated, but there is nowhere to put it. Say so plainly rather than
    // pretending it was filed.
    return NextResponse.json({
      ok: true,
      message:
        'Checked and accepted, but no database is connected yet, so this was not stored.',
    });
  }

  const { error } = await sb.from('proofs').insert({
    commitment_id: commitmentId,
    kind,
    claim,
    direction,
    submitted_by: submittedBy,
    submitter_kind: submitterKind,
    media_urls: mediaUrls,
    verdict: 'pending',
    corroborations: 0,
  });

  if (error) {
    return NextResponse.json(
      isRateLimited(error.message)
        ? { ok: false, message: RATE_LIMITED_MESSAGE }
        : { ok: false, message: intakeFailure('proof', error.message) },
      { status: isRateLimited(error.message) ? 429 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Filed. A volunteer will check it against the site.',
  });
}
