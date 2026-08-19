import { NextResponse } from 'next/server';
import { getSupabaseAsUser, tokenFromRequest } from '@/lib/supabase';
import { intakeFailure } from '@/lib/intake';

const CATEGORIES = new Set([
  'education',
  'infrastructure',
  'water',
  'health',
  'safety',
  'jobs',
  'governance',
]);

/** Complaints always start `open`. Only a reviewer can move them on. */
export async function POST(request: Request) {
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

  const title = String(payload.title ?? '').trim();
  const body = String(payload.body ?? '').trim();
  const category = String(payload.category ?? '');
  const stateSlug = String(payload.stateSlug ?? '').trim().toLowerCase();
  const districtSlug = payload.districtSlug
    ? String(payload.districtSlug).trim().toLowerCase()
    : null;
  const commitmentId = payload.commitmentId ? String(payload.commitmentId) : null;
  const filedBy = String(payload.filedBy ?? 'Anonymous').slice(0, 80);
  const mediaUrls = Array.isArray(payload.mediaUrls)
    ? (payload.mediaUrls as unknown[]).map(String).slice(0, 8)
    : [];

  if (title.length < 10) {
    return NextResponse.json(
      { ok: false, message: 'Give it a clearer one-line summary.' },
      { status: 400 },
    );
  }
  if (body.length < 30) {
    return NextResponse.json(
      { ok: false, message: 'Add more detail: dates, what you saw, who you spoke to.' },
      { status: 400 },
    );
  }
  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ ok: false, message: 'Pick a category.' }, { status: 400 });
  }
  if (!stateSlug) {
    return NextResponse.json(
      { ok: false, message: 'Which state is this in?' },
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

  const { error } = await sb.from('complaints').insert({
    commitment_id: commitmentId,
    state_slug: stateSlug,
    district_slug: districtSlug,
    title,
    body,
    category,
    filed_by: filedBy,
    status: 'open',
    seconded: 0,
    media_urls: mediaUrls,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: intakeFailure('complaint', error.message) },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Filed. It is now on the public complaints register.',
  });
}
