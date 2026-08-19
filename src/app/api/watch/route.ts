import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { intakeFailure,
  bodyTooLarge,
  TOO_LARGE_MESSAGE,
  isRateLimited,
  RATE_LIMITED_MESSAGE,
} from '@/lib/intake';

const ROLES = new Set(['logger', 'follower', 'journalist', 'official']);

/**
 * Subscribes an address to one promise's deadline alerts.
 *
 * Rows land with `confirmed = false`. The alert sweep only reads confirmed
 * watchers, so an address typed in by somebody else cannot be signed up to
 * receive mail — the double opt-in is what keeps this from being an open relay
 * for spamming a third party.
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
  const email = String(payload.email ?? '').trim().toLowerCase();
  const name = String(payload.name ?? '').slice(0, 80);
  const role = String(payload.role ?? 'follower');

  if (!commitmentId) {
    return NextResponse.json(
      { ok: false, message: 'Which promise are you watching?' },
      { status: 400 },
    );
  }
  // Deliberately loose: the confirmation email is the real validator, and a
  // strict pattern here mostly rejects addresses that are perfectly valid.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json(
      { ok: false, message: 'That does not look like an email address.' },
      { status: 400 },
    );
  }
  if (!ROLES.has(role)) {
    return NextResponse.json({ ok: false, message: 'Unknown role.' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({
      ok: true,
      message:
        'Checked, but no database is connected yet, so this subscription was not stored.',
    });
  }

  const { error } = await sb
    .from('watchers')
    .upsert(
      {
        commitment_id: commitmentId,
        email,
        name: name || 'Anonymous',
        role,
        confirmed: false,
      },
      { onConflict: 'commitment_id,email' },
    );

  if (error) {
    return NextResponse.json(
      isRateLimited(error.message)
        ? { ok: false, message: RATE_LIMITED_MESSAGE }
        : { ok: false, message: intakeFailure('watch', error.message) },
      { status: isRateLimited(error.message) ? 429 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Check your inbox and confirm. You will not get anything until you do.',
  });
}
