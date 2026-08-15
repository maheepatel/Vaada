import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCommitments, getProofs } from '@/lib/data';
import { getServiceSupabase } from '@/lib/supabase';
import { sendEmail, isMailerConfigured } from '@/lib/mailer';
import {
  alertConfigFromEnv,
  findAlertable,
  planAlerts,
  watchersFor,
} from '@/lib/alerts';
import type { AlertRecord, Watcher } from '@/lib/types';

/**
 * The deadline sweep. Runs on a schedule (see vercel.json) and is safe to run
 * as often as you like, because every notice is de-duplicated against what has
 * already gone out.
 *
 * Vercel Cron can only issue GET, so GET is the real run. `?preview=1` composes
 * everything and sends nothing, whatever the config says — that is the safe way
 * to read what would go out before switching sending on.
 *
 * Three independent things must all be true before a single email leaves:
 * CRON_SECRET must match, ALERTS_ENABLED must be 'true', and for notices to
 * officials ALERTS_NOTIFY_AUTHORITIES must also be 'true'. Any one of them
 * missing means the run still happens and is still recorded — as a dry run.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron endpoints are public URLs. Without this anybody could drive the mailer.
 * Compared without early-exit so the check does not leak length through timing.
 */
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';

  const header = request.headers.get('authorization') ?? '';
  const provided = header.replace(/^Bearer\s+/i, '');
  if (provided.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

/** `commitmentId:kind` pairs already dispatched, so nothing is sent twice. */
async function loadAlreadySent(): Promise<Set<string>> {
  const sb = getServiceSupabase();
  if (!sb) return new Set();
  const { data, error } = await sb
    .from('alerts')
    .select('commitment_id, kind')
    .in('state', ['sent', 'queued']);
  if (error || !data) return new Set();
  return new Set(
    (data as { commitment_id: string; kind: string }[]).map(
      (r) => `${r.commitment_id}:${r.kind}`,
    ),
  );
}

async function loadWatchers(): Promise<Map<string, Watcher[]>> {
  const sb = getServiceSupabase();
  const out = new Map<string, Watcher[]>();
  if (!sb) return out;

  const { data, error } = await sb
    .from('watchers')
    .select('commitment_id, name, email, role')
    .eq('confirmed', true);
  if (error || !data) return out;

  for (const row of data as {
    commitment_id: string;
    name: string;
    email: string;
    role: Watcher['role'];
  }[]) {
    const list = out.get(row.commitment_id) ?? [];
    list.push({ name: row.name, email: row.email, role: row.role });
    out.set(row.commitment_id, list);
  }
  return out;
}

async function run(dryRunOnly: boolean) {
  const now = Date.now();
  const cfg = alertConfigFromEnv();
  const effective = dryRunOnly ? { ...cfg, enabled: false } : cfg;

  const [commitments, proofs, alreadySent, watcherMap] = await Promise.all([
    getCommitments(),
    getProofs(),
    loadAlreadySent(),
    loadWatchers(),
  ]);

  const candidates = findAlertable(commitments, now, alreadySent);
  const sb = getServiceSupabase();

  const planned: Omit<AlertRecord, 'id'>[] = [];
  for (const candidate of candidates) {
    const watchers = watchersFor(
      candidate.commitment,
      watcherMap.get(candidate.commitment.id) ?? [],
    );
    const commitmentProofs = proofs.filter(
      (p) => p.commitmentId === candidate.commitment.id,
    );
    planned.push(...planAlerts(candidate, effective, watchers, commitmentProofs, now));
  }

  let sent = 0;
  let failed = 0;

  for (const alert of planned) {
    if (alert.state === 'queued') {
      const result = await sendEmail(
        effective,
        alert.recipients,
        alert.subject,
        alert.body,
      );
      if (result.ok) {
        alert.state = 'sent';
        alert.sentAt = new Date().toISOString();
        sent += 1;
      } else if (result.skipped) {
        alert.state = 'dry_run';
        alert.note = result.error;
      } else {
        alert.state = 'failed';
        alert.note = result.error;
        failed += 1;
      }
    }

    // Every alert is recorded, including dry runs and suppressions, so the
    // operator can read exactly what would go out before switching sending on.
    if (sb) {
      await sb.from('alerts').insert({
        commitment_id: alert.commitmentId,
        kind: alert.kind,
        audience: alert.audience,
        recipients: alert.recipients,
        subject: alert.subject,
        body: alert.body,
        state: alert.state,
        note: alert.note ?? null,
        sent_at: alert.sentAt ?? null,
      });
    }
  }

  if (sent > 0) {
    revalidatePath('/');
    revalidatePath('/deadlines');
  }

  return {
    ranAt: new Date(now).toISOString(),
    mode: dryRunOnly ? 'preview' : effective.enabled ? 'live' : 'dry-run',
    config: {
      alertsEnabled: cfg.enabled,
      authorityNoticesEnabled: cfg.notifyAuthorities,
      mailerConfigured: isMailerConfigured(),
      storeConfigured: Boolean(sb),
    },
    breaches: candidates.filter((c) => c.kind === 'breach').length,
    dueSoon: candidates.filter((c) => c.kind === 'due_soon').length,
    planned: planned.length,
    sent,
    failed,
    suppressed: planned.filter((a) => a.state === 'suppressed').length,
    alerts: planned.map((a) => ({
      commitmentId: a.commitmentId,
      kind: a.kind,
      audience: a.audience,
      recipients: a.recipients,
      subject: a.subject,
      state: a.state,
      note: a.note,
    })),
  };
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorised' }, { status: 401 });
  }
  const preview = new URL(request.url).searchParams.get('preview') === '1';
  return NextResponse.json({ ok: true, ...(await run(preview)) });
}

export const POST = GET;
