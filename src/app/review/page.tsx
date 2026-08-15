import type { Metadata } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { formatDate, formatDateTime } from '@/lib/format';
import { Card, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review queue',
  robots: { index: false, follow: false },
};

/**
 * The reviewer's queue — everything the daily sweep and the public intake form
 * have found, waiting for a human to accept or reject it.
 *
 * ACCESS. This is gated by a shared token in the URL, checked against
 * REVIEW_TOKEN. That is thin, and it is stated plainly rather than dressed up:
 * it suits a single operator or a small trusted group, and it should be
 * replaced with real accounts before more than a handful of people review.
 * What it does guarantee is that unreviewed machine output — which names real
 * officials and has not been checked by anybody — is not sitting on a public
 * URL waiting to be indexed.
 */

interface CandidateRow {
  id: string;
  headline: string;
  url: string;
  source_label: string;
  published_at: string;
  guessed_state: string | null;
  guessed_district: string | null;
  tier: 'extracted' | 'lead';
  drafts: {
    title: string;
    deadline: string | null;
    deadlineLabel: string | null;
    category: string;
    confidence: string;
    namedOfficials?: string[];
  }[];
  review_status: string;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  publisher: string;
  source_url: string;
  state: string;
  district: string | null;
  locality: string;
  promised_on: string;
  receipt_signed: boolean;
  receipt_media: string[];
  drafts: { title: string; deadline: string | null; deadlineLabel: string | null }[];
  created_at: string;
}

export default async function ReviewPage({ searchParams }: PageProps<'/review'>) {
  const { token } = await searchParams;
  const expected = process.env.REVIEW_TOKEN;

  if (!expected) {
    return (
      <Shell>
        <Card className="p-5">
          <p className="text-[0.95rem] font-semibold">Review queue is not configured.</p>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">
            Set <code className="font-mono">REVIEW_TOKEN</code> in the environment,
            then open this page with <code className="font-mono">?token=…</code>.
            Until then the queue stays closed. Unreviewed machine output names
            real officials and should not sit on a public URL.
          </p>
        </Card>
      </Shell>
    );
  }

  if (token !== expected) {
    return (
      <Shell>
        <Card className="p-5">
          <p className="text-[0.95rem] font-semibold">Not authorised.</p>
          <p className="mt-2 text-[0.85rem] text-ink-2">
            This queue needs a valid token.
          </p>
        </Card>
      </Shell>
    );
  }

  const sb = getServiceSupabase();
  if (!sb) {
    return (
      <Shell>
        <Card className="p-5">
          <p className="text-[0.95rem] font-semibold">No database connected.</p>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">
            The queue lives in Supabase and is read with the service role. Set{' '}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to use it.
          </p>
        </Card>
      </Shell>
    );
  }

  const [candidatesRes, submissionsRes] = await Promise.all([
    sb
      .from('ingest_candidates')
      .select('*')
      .eq('review_status', 'queued')
      // Candidates carrying parsed dates first — they are the ones that turn
      // into rows with the least work.
      .order('tier', { ascending: true })
      .order('published_at', { ascending: false })
      .limit(50),
    sb
      .from('submissions')
      .select('*')
      .eq('review_status', 'queued')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const candidates = (candidatesRes.data ?? []) as CandidateRow[];
  const submissions = (submissionsRes.data ?? []) as SubmissionRow[];

  return (
    <Shell>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Card className="p-4">
          <p className="eyebrow">From people</p>
          <p className="display tnum mt-1 text-3xl">{submissions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="eyebrow">From the daily sweep</p>
          <p className="display tnum mt-1 text-3xl">{candidates.length}</p>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="display text-2xl">Submitted by people</h2>
        <p className="mt-1 text-[0.85rem] text-ink-2">
          Review these first. Somebody watched this happen.
        </p>
        <div className="mt-4 space-y-3">
          {submissions.length === 0 ? (
            <Empty title="Nothing waiting." />
          ) : (
            submissions.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-[0.95rem] font-semibold">
                    {s.locality || s.district || s.state}
                  </h3>
                  <span className="text-[0.72rem] text-ink-3">
                    {formatDateTime(s.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-[0.8rem] text-ink-3">
                  {s.publisher} · promised {formatDate(s.promised_on)} ·{' '}
                  {s.district ? `${s.district}, ` : ''}
                  {s.state}
                </p>

                <div className="mt-2 flex flex-wrap gap-2 text-[0.72rem] font-medium">
                  {s.receipt_signed && (
                    <span
                      className="rounded px-1.5 py-0.5"
                      style={{
                        background: 'var(--band-kept-soft)',
                        color: 'var(--band-kept-ink)',
                      }}
                    >
                      signed document
                    </span>
                  )}
                  <span
                    className="rounded px-1.5 py-0.5"
                    style={
                      s.receipt_media?.length
                        ? { background: 'var(--band-kept-soft)', color: 'var(--band-kept-ink)' }
                        : { background: 'var(--band-urgent-soft)', color: 'var(--band-urgent-ink)' }
                    }
                  >
                    {s.receipt_media?.length
                      ? `${s.receipt_media.length} archived file(s)`
                      : 'no archived copy'}
                  </span>
                </div>

                <ul className="mt-3 space-y-1 border-l pl-3">
                  {s.drafts.map((d, i) => (
                    <li key={i} className="text-[0.83rem]">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-ink-3">
                        {d.deadlineLabel
                          ? `: “${d.deadlineLabel}”, due ${formatDate(d.deadline)}`
                          : ', no deadline'}
                      </span>
                    </li>
                  ))}
                </ul>

                {s.source_url && (
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-2 inline-block text-[0.78rem] font-semibold text-[var(--brand-ink)] hover:underline"
                  >
                    Open the source ↗
                  </a>
                )}
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="display text-2xl">Found by the daily sweep</h2>
        <p className="mt-1 text-[0.85rem] text-ink-2">
          Machine output. Every one of these needs the source read before it goes
          anywhere near the map.
        </p>
        <div className="mt-4 space-y-3">
          {candidates.length === 0 ? (
            <Empty
              title="Nothing waiting."
              hint="The sweep runs daily; it often finds nothing, which is the correct result."
            />
          ) : (
            candidates.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-[0.95rem] font-semibold leading-snug">
                    {c.headline}
                  </h3>
                  <span className="text-[0.72rem] text-ink-3">
                    {formatDate(c.published_at)}
                  </span>
                </div>
                <p className="mt-1 text-[0.78rem] text-ink-3">
                  {c.source_label}
                  {c.guessed_state ? ` · guessed: ${c.guessed_state}` : ''}
                  {c.guessed_district ? `, ${c.guessed_district}` : ''}
                </p>

                <ul className="mt-3 space-y-1 border-l pl-3">
                  {c.drafts.map((d, i) => (
                    <li key={i} className="text-[0.83rem]">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-ink-3">
                        {d.deadlineLabel
                          ? `: “${d.deadlineLabel}”, due ${formatDate(d.deadline)}`
                          : ''}
                        {' · '}
                        {d.confidence} confidence
                      </span>
                      {d.namedOfficials && d.namedOfficials.length > 0 && (
                        <span className="ml-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[0.72rem]">
                          {d.namedOfficials.join(', ')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-2 inline-block text-[0.78rem] font-semibold text-[var(--brand-ink)] hover:underline"
                >
                  Read the article ↗
                </a>
              </Card>
            ))
          )}
        </div>
      </section>

      <Card className="mt-10 p-5">
        <p className="eyebrow">Promoting a candidate</p>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">
          There is no accept button here yet. Promotion is done in the Supabase
          dashboard by inserting into <code className="font-mono">commitments</code>{' '}
          and setting the queue row to <code className="font-mono">accepted</code>.
          Building a one-click accept before the reviewing workflow has been used
          in anger would be guessing at what reviewers actually need.
        </p>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="eyebrow">Internal</p>
        <h1 className="h-page display mt-2">Review queue</h1>
        <p className="mt-2 text-[0.9rem] text-ink-2">
          Nothing reaches the public map without passing through here.
        </p>
      </header>
      {children}
    </div>
  );
}
