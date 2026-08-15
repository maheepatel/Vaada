import 'server-only';

import { COMMITMENTS, COMPLAINTS, PROOFS, RECEIPTS } from '@/data/seed';
import { getSupabase } from './supabase';
import type { Commitment, Complaint, Proof, Receipt } from './types';

/**
 * The read layer.
 *
 * Everything is "Supabase if it is configured, seed file otherwise". That is
 * not a stopgap: the seed file is the canonical founding register, and a fresh
 * Supabase project is seeded *from* it (see supabase/seed.sql), so both paths
 * return the same shape and the UI never branches on which one it got.
 *
 * Rows come back snake_case from Postgres and are mapped here rather than in
 * the components, so a schema rename touches exactly one file.
 */

const revalidate = { next: { revalidate: 60 } };
void revalidate; // kept for when queries move to fetch-based REST calls

type Row = Record<string, unknown>;

function rowToCommitment(r: Row): Commitment {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    detail: String(r.detail ?? ''),
    state: String(r.state),
    stateSlug: String(r.state_slug),
    district: (r.district as string | null) ?? null,
    districtSlug: (r.district_slug as string | null) ?? null,
    locality: String(r.locality ?? ''),
    category: r.category as Commitment['category'],
    status: r.status as Commitment['status'],
    promisedOn: String(r.promised_on),
    deadline: (r.deadline as string | null) ?? null,
    deadlineLabel: (r.deadline_label as string | null) ?? null,
    progress: Number(r.progress ?? 0),
    weight: Number(r.weight ?? 1),
    beneficiaries: r.beneficiaries === null ? null : Number(r.beneficiaries),
    accountable: (r.accountable as Commitment['accountable']) ?? [],
    demandedBy: String(r.demanded_by ?? ''),
    sources: (r.sources as Commitment['sources']) ?? [],
    timeline: (r.timeline as Commitment['timeline']) ?? [],
    updatedAt: String(r.updated_at ?? r.promised_on),
  };
}

function rowToProof(r: Row): Proof {
  return {
    id: String(r.id),
    commitmentId: String(r.commitment_id),
    kind: r.kind as Proof['kind'],
    claim: String(r.claim ?? ''),
    direction: r.direction as Proof['direction'],
    submittedBy: String(r.submitted_by ?? 'Anonymous'),
    submitterKind: r.submitter_kind as Proof['submitterKind'],
    submittedAt: String(r.submitted_at),
    mediaUrls: (r.media_urls as string[]) ?? [],
    verdict: r.verdict as Proof['verdict'],
    reviewedBy: (r.reviewed_by as string | undefined) ?? undefined,
    reviewNote: (r.review_note as string | undefined) ?? undefined,
    corroborations: Number(r.corroborations ?? 0),
  };
}

function rowToReceipt(r: Row): Receipt {
  return {
    id: String(r.id),
    commitmentId: String(r.commitment_id),
    kind: r.kind as Receipt['kind'],
    title: String(r.title),
    description: (r.description as string | undefined) ?? undefined,
    mediaUrls: (r.media_urls as string[]) ?? [],
    url: (r.url as string | undefined) ?? undefined,
    documentDate: String(r.document_date),
    signed: Boolean(r.signed),
    quote: (r.quote as string | undefined) ?? undefined,
    addedBy: String(r.added_by ?? 'Anonymous'),
    verified: Boolean(r.verified),
  };
}

function rowToComplaint(r: Row): Complaint {
  return {
    id: String(r.id),
    commitmentId: (r.commitment_id as string | null) ?? null,
    stateSlug: String(r.state_slug),
    districtSlug: (r.district_slug as string | null) ?? null,
    title: String(r.title),
    body: String(r.body ?? ''),
    category: r.category as Complaint['category'],
    filedBy: String(r.filed_by ?? 'Anonymous'),
    filedAt: String(r.filed_at),
    status: r.status as Complaint['status'],
    seconded: Number(r.seconded ?? 0),
    mediaUrls: (r.media_urls as string[]) ?? [],
    officialResponse: (r.official_response as string | undefined) ?? undefined,
    respondedAt: (r.responded_at as string | undefined) ?? undefined,
  };
}

export async function getCommitments(): Promise<Commitment[]> {
  const sb = getSupabase();
  if (!sb) return COMMITMENTS;

  const { data, error } = await sb.from('commitments').select('*');
  // A misconfigured or empty project should show the founding register rather
  // than an empty page — the register is the product, an outage is not a reason
  // to show nothing.
  if (error || !data || data.length === 0) return COMMITMENTS;
  return (data as Row[]).map(rowToCommitment);
}

export async function getProofs(): Promise<Proof[]> {
  const sb = getSupabase();
  if (!sb) return PROOFS;
  const { data, error } = await sb.from('proofs').select('*');
  if (error || !data) return PROOFS;
  return (data as Row[]).map(rowToProof);
}

export async function getComplaints(): Promise<Complaint[]> {
  const sb = getSupabase();
  if (!sb) return COMPLAINTS;
  const { data, error } = await sb.from('complaints').select('*');
  if (error || !data) return COMPLAINTS;
  return (data as Row[]).map(rowToComplaint);
}

export async function getReceipts(): Promise<Receipt[]> {
  const sb = getSupabase();
  if (!sb) return RECEIPTS;
  const { data, error } = await sb.from('receipts').select('*');
  if (error || !data) return RECEIPTS;
  return (data as Row[]).map(rowToReceipt);
}

/** Everything a page needs, fetched once. */
export async function getRegister() {
  const [commitments, proofs, complaints, receipts] = await Promise.all([
    getCommitments(),
    getProofs(),
    getComplaints(),
    getReceipts(),
  ]);
  return { commitments, proofs, complaints, receipts };
}

/**
 * The counts every page needs to turn a `Commitment` into a `LiveCommitment`.
 * Built once per request rather than per row, so a 500-row register is still
 * one pass rather than 2,000 array scans.
 */
export function buildCounts(
  proofs: Proof[],
  complaints: Complaint[],
  receipts: Receipt[],
) {
  const proofCounts = countBy(proofs, (p) => p.commitmentId);
  const complaintCounts = countBy(
    complaints.filter((c) => c.commitmentId),
    (c) => c.commitmentId as string,
  );
  const receiptCounts = countBy(receipts, (r) => r.commitmentId);
  const signedCounts = countBy(
    receipts.filter((r) => r.signed),
    (r) => r.commitmentId,
  );

  return (id: string) => ({
    proofs: proofCounts.get(id),
    complaints: complaintCounts.get(id),
    receipts: receiptCounts.get(id),
    signedReceipts: signedCounts.get(id),
  });
}

export async function getCommitmentBySlug(slug: string): Promise<Commitment | null> {
  const all = await getCommitments();
  return all.find((c) => c.slug === slug) ?? null;
}

/** Per-commitment counts, so cards can show them without an N+1. */
export function countBy<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
