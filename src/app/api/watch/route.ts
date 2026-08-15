import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

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
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
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
        'Checked, but no database is connected yet — this subscription was not stored.',
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
      { ok: false, message: `Could not subscribe: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Check your inbox and confirm — you will not get anything until you do.',
  });
}
