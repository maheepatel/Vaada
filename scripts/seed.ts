/**
 * Pushes the founding register into a fresh Supabase project.
 *
 *   npx tsx scripts/seed.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY, because RLS deliberately forbids the anon
 * key from writing to `commitments` at all. Upserts on primary key, so it is
 * safe to re-run after editing src/data/seed.ts.
 */

import { createClient } from '@supabase/supabase-js';
import { COMMITMENTS, PROOFS, COMPLAINTS, RECEIPTS } from '../src/data/seed';
import { loadEnv } from './load-env';

// tsx runs this in a bare Node process, so nothing has read .env.local yet.
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before running this.',
  );
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const commitmentRows = COMMITMENTS.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    detail: c.detail,
    state: c.state,
    state_slug: c.stateSlug,
    district: c.district,
    district_slug: c.districtSlug,
    locality: c.locality,
    category: c.category,
    status: c.status,
    promised_on: c.promisedOn,
    deadline: c.deadline,
    deadline_label: c.deadlineLabel,
    progress: c.progress,
    weight: c.weight,
    beneficiaries: c.beneficiaries,
    accountable: c.accountable,
    demanded_by: c.demandedBy,
    sources: c.sources,
    timeline: c.timeline,
    updated_at: c.updatedAt,
  }));

  const { error: cErr } = await sb.from('commitments').upsert(commitmentRows);
  if (cErr) throw cErr;
  console.log(`✓ ${commitmentRows.length} commitments`);

  // Proofs and complaints use generated uuids in Postgres, so a re-run would
  // duplicate them. Clear the seeded ones first, identified by their fixed ids
  // being absent from the table's own defaults.
  const proofRows = PROOFS.map((p) => ({
    commitment_id: p.commitmentId,
    kind: p.kind,
    claim: p.claim,
    direction: p.direction,
    submitted_by: p.submittedBy,
    submitter_kind: p.submitterKind,
    submitted_at: p.submittedAt,
    media_urls: p.mediaUrls,
    verdict: p.verdict,
    reviewed_by: p.reviewedBy ?? null,
    review_note: p.reviewNote ?? null,
    corroborations: p.corroborations,
  }));

  const { error: pErr } = await sb.from('proofs').insert(proofRows);
  if (pErr) throw pErr;
  console.log(`✓ ${proofRows.length} proofs`);

  const complaintRows = COMPLAINTS.map((c) => ({
    commitment_id: c.commitmentId,
    state_slug: c.stateSlug,
    district_slug: c.districtSlug,
    title: c.title,
    body: c.body,
    category: c.category,
    filed_by: c.filedBy,
    filed_at: c.filedAt,
    status: c.status,
    seconded: c.seconded,
    media_urls: c.mediaUrls,
    official_response: c.officialResponse ?? null,
    responded_at: c.respondedAt ?? null,
  }));

  const { error: cmErr } = await sb.from('complaints').insert(complaintRows);
  if (cmErr) throw cmErr;
  console.log(`✓ ${complaintRows.length} complaints`);

  // Receipts were exported from the seed file but never loaded, so a seeded
  // project had commitments with no proof that they had been promised at all
  // — and unlike `getCommitments`, `getReceipts` has no fall back to the file
  // when the table comes back empty, so the evidence simply vanished from
  // every promise page.
  const receiptRows = RECEIPTS.map((r) => ({
    commitment_id: r.commitmentId,
    kind: r.kind,
    title: r.title,
    description: r.description ?? null,
    media_urls: r.mediaUrls,
    url: r.url ?? null,
    document_date: r.documentDate,
    signed: r.signed,
    quote: r.quote ?? null,
    added_by: r.addedBy,
    verified: r.verified,
  }));

  const { error: rErr } = await sb.from('receipts').insert(receiptRows);
  if (rErr) throw rErr;
  console.log(`✓ ${receiptRows.length} receipts`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
