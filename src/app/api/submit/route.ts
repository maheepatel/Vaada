import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
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
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
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

  const submission = {
    source_url: String(payload.sourceUrl ?? ''),
    publisher: String(payload.publisher ?? 'Unattributed post').slice(0, 120),
    raw_text: rawText.slice(0, 8000),
    promised_on: promisedOn,
    state,
    state_slug: slugify(state),
    district: district || null,
    district_slug: district ? slugify(district) : null,
    locality: String(payload.locality ?? '').slice(0, 200),
    demanded_by: String(payload.demandedBy ?? '').slice(0, 200),
    handles: Array.isArray(payload.handles)
      ? (payload.handles as unknown[]).map(String).slice(0, 30)
      : [],
    image_count: Number(payload.imageCount ?? 0),
    drafts: rows,
    review_status: 'queued',
  };

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({
      ok: true,
      message: `${rows.length} promise${rows.length === 1 ? '' : 's'} parsed and validated, but no database is connected yet — nothing was stored.`,
    });
  }

  const { error } = await sb.from('submissions').insert(submission);
  if (error) {
    return NextResponse.json(
      { ok: false, message: `Could not queue it: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Queued ${rows.length} promise${rows.length === 1 ? '' : 's'} for review.`,
  });
}
