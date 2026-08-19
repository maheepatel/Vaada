/**
 * Turning an accepted submission into register rows.
 *
 * This is the last mile that was missing: the queue existed, the intake
 * existed, and promotion was a hand-written INSERT in the Supabase dashboard.
 *
 * It is pure and takes `now` explicitly, like `status.ts`, so the same
 * submission always produces the same rows and the mapping can be reasoned
 * about without a database.
 *
 * What it deliberately does NOT do is decide anything. A reviewer has already
 * read the source and pressed accept; this only reshapes what they approved.
 * Nothing in here may ever be called from the ingest sweep — rule 3 in
 * docs/PROJECT-NOTES.md exists because a pipeline that publishes its own
 * guesses about a named minister will eventually be wrong about a real person.
 */

import { slugify } from './format';
import type { Category } from './types';

const CATEGORIES: Category[] = [
  'education',
  'infrastructure',
  'water',
  'health',
  'safety',
  'jobs',
  'governance',
];

function asCategory(raw: unknown): Category {
  const s = String(raw ?? '').toLowerCase();
  return (CATEGORIES as string[]).includes(s) ? (s as Category) : 'governance';
}

export interface SubmissionRecord {
  id: string;
  source_url: string;
  publisher: string;
  promised_on: string;
  state: string;
  state_slug: string;
  district: string | null;
  district_slug: string | null;
  subdistrict: string | null;
  village: string | null;
  school: string | null;
  udise: string | null;
  pincode: string | null;
  locality: string;
  demanded_by: string;
  receipt_kind: string | null;
  receipt_signed: boolean;
  receipt_media: string[] | null;
  drafts: {
    title?: string;
    detail?: string;
    deadline?: string | null;
    deadlineLabel?: string | null;
    category?: string;
    namedOfficials?: string[];
  }[];
}

export interface CommitmentRow {
  id: string;
  slug: string;
  title: string;
  detail: string;
  state: string;
  state_slug: string;
  district: string | null;
  district_slug: string | null;
  locality: string;
  subdistrict: string | null;
  village: string | null;
  school: string | null;
  udise: string | null;
  pincode: string | null;
  category: Category;
  status: string;
  promised_on: string;
  deadline: string | null;
  deadline_label: string | null;
  progress: number;
  weight: number;
  beneficiaries: number | null;
  accountable: { name: string; role: string }[];
  demanded_by: string;
  sources: { kind: string; publisher: string; url: string; date: string }[];
  timeline: { at: string; label: string; note: string }[];
}

/** A short, stable discriminator so two identical titles cannot collide. */
function shortId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).slice(0, 6);
}

export function commitmentRowsFrom(
  sub: SubmissionRecord,
  now: number,
): CommitmentRow[] {
  const nowIso = new Date(now).toISOString();

  return sub.drafts
    .map((d, i): CommitmentRow | null => {
      const title = String(d.title ?? '').trim().slice(0, 160);
      if (title.length < 8) return null;

      // The table enforces that a deadline and the phrase it came from arrive
      // together — a date with no quoted wording cannot be defended later — so
      // a draft carrying only one of the two loses both.
      const hasBoth = Boolean(d.deadline && d.deadlineLabel);
      const deadline = hasBoth ? String(d.deadline) : null;
      const deadlineLabel = hasBoth ? String(d.deadlineLabel) : null;

      const seed = `${sub.id}-${i}-${title}`;
      const slug = `${slugify(title).slice(0, 50)}-${shortId(seed)}`;

      const officials = Array.isArray(d.namedOfficials) ? d.namedOfficials : [];

      return {
        id: `sub_${shortId(seed)}`,
        slug,
        title,
        detail: String(d.detail ?? '').slice(0, 1200),
        state: sub.state,
        state_slug: sub.state_slug,
        district: sub.district,
        district_slug: sub.district_slug,
        locality: sub.locality,
        subdistrict: sub.subdistrict,
        village: sub.village,
        school: sub.school,
        udise: sub.udise,
        pincode: sub.pincode,
        category: asCategory(d.category),
        // Accepted onto the register, with no work visible yet. Progress stays
        // at zero until somebody accepts evidence for it — an official saying
        // it is done does not move this, and neither does promotion.
        status: 'promised',
        promised_on: sub.promised_on,
        deadline,
        deadline_label: deadlineLabel,
        progress: 0,
        weight: 1,
        beneficiaries: null,
        // "Named in the source" and nothing stronger. The register records that
        // this person was reported as answerable, which is what it can show.
        accountable: officials
          .map((n) => String(n).trim())
          .filter(Boolean)
          .slice(0, 8)
          .map((name) => ({ name, role: 'Named in the source' })),
        demanded_by: sub.demanded_by,
        sources: sub.source_url
          ? [
              {
                kind: 'news',
                publisher: sub.publisher || 'Unattributed post',
                url: sub.source_url,
                date: sub.promised_on,
              },
            ]
          : [],
        timeline: [
          {
            at: sub.promised_on,
            label: 'Promised in public',
            note: sub.publisher ? `Reported by ${sub.publisher}.` : '',
          },
          {
            at: nowIso,
            label: 'Added to the register',
            note: 'A reviewer checked this against its source before it appeared.',
          },
        ],
      };
    })
    .filter((r): r is CommitmentRow => r !== null);
}

/** The receipt rows proving the promise was made, one per archived file. */
export function receiptRowsFrom(
  sub: SubmissionRecord,
  commitments: CommitmentRow[],
): Record<string, unknown>[] {
  const media = sub.receipt_media ?? [];
  if (media.length === 0 && !sub.source_url) return [];

  return commitments.map((c) => ({
    commitment_id: c.id,
    kind: sub.receipt_kind || 'social_post',
    title: `Evidence for: ${c.title}`.slice(0, 160),
    media_urls: media,
    url: sub.source_url || null,
    document_date: sub.promised_on.slice(0, 10),
    signed: sub.receipt_signed,
    added_by: 'Submitted by the public',
    verified: false,
  }));
}
