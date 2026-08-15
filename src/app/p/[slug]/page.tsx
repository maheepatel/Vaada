import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRegister } from '@/lib/data';
import {
  toLive,
  BAND_STYLE,
  CATEGORY_LABEL,
  STATUS_LABEL,
  bandTexture,
} from '@/lib/status';
import { formatDate, formatDateTime, formatCount, roughDuration } from '@/lib/format';
import { Countdown } from '@/components/Countdown';
import { ProofForm } from '@/components/ProofForm';
import { Receipts } from '@/components/Receipts';
import { AccountablePanel } from '@/components/AccountablePanel';
import { WatchForm } from '@/components/WatchForm';
import { BandChip, Card, ProgressBar, SectionHeading, Empty } from '@/components/ui';
import type { Proof, TimelineEvent } from '@/lib/types';

export const revalidate = 60;

export async function generateStaticParams() {
  const { commitments } = await getRegister();
  return commitments.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/p/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const { commitments } = await getRegister();
  const c = commitments.find((x) => x.slug === slug);
  if (!c) return { title: 'Promise not found' };
  return {
    title: c.title,
    description: `${c.detail.slice(0, 155)}`,
  };
}

export default async function PromisePage({ params }: PageProps<'/p/[slug]'>) {
  const { slug } = await params;
  const now = Date.now();
  const { commitments, proofs, complaints, receipts } = await getRegister();

  const base = commitments.find((c) => c.slug === slug);
  if (!base) notFound();

  const myProofs = proofs.filter((p) => p.commitmentId === base.id);
  const myComplaints = complaints.filter((p) => p.commitmentId === base.id);
  const myReceipts = receipts.filter((r) => r.commitmentId === base.id);
  const c = toLive(base, now, {
    proofs: myProofs.length,
    complaints: myComplaints.length,
    receipts: myReceipts.length,
    signedReceipts: myReceipts.filter((r) => r.signed).length,
  });
  const style = BAND_STYLE[c.band];

  const windowMs = c.deadline
    ? Date.parse(c.deadline) - Date.parse(c.promisedOn)
    : null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[0.8rem] text-ink-3">
        <Link href="/" className="hover:text-ink">Map</Link>
        <span>/</span>
        <Link href={`/s/${c.stateSlug}`} className="hover:text-ink">{c.state}</Link>
        {c.districtSlug && (
          <>
            <span>/</span>
            <Link
              href={`/s/${c.stateSlug}/${c.districtSlug}`}
              className="hover:text-ink"
            >
              {c.district}
            </Link>
          </>
        )}
      </nav>

      {/* ===== Headline block, colour-led ===== */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: style.fill }}
      >
        <div
          className={`px-5 py-6 sm:px-7 sm:py-7 ${bandTexture(c.band)}`}
          style={{ background: style.soft }}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <BandChip band={c.band} />
            <span className="text-[0.75rem] font-medium text-ink-3">
              {CATEGORY_LABEL[c.category]}
            </span>
            <span className="text-[0.75rem] font-medium text-ink-3">
              {STATUS_LABEL[c.status]}
            </span>
          </div>

          <h1 className="display mt-3 max-w-3xl text-[2rem] leading-[1.12] sm:text-[2.6rem]">
            {c.title}
          </h1>

          <p className="mt-2 text-[0.88rem] font-medium text-ink-2">
            {c.locality}
            {c.district ? `, ${c.district}` : ''} · {c.state}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-5">
            <div>
              <p className="eyebrow">
                {c.band === 'kept'
                  ? 'Delivered'
                  : c.msRemaining === null
                    ? 'No deadline was ever given'
                    : c.msRemaining > 0
                      ? 'Time left'
                      : 'Overdue by'}
              </p>
              <div className="mt-1.5">
                {/* A kept promise gets no clock. Counting up past the deadline
                    on work that was actually done would be plainly wrong. */}
                {c.band === 'kept' ? (
                  <p className="display text-2xl sm:text-3xl">
                    {c.deadline ? `by ${formatDate(c.deadline)}` : 'Completed'}
                  </p>
                ) : c.deadline && c.msRemaining !== null ? (
                  <Countdown
                    deadline={c.deadline}
                    initialMs={c.msRemaining}
                    band={c.band}
                    size="lg"
                  />
                ) : (
                  <p className="display text-2xl text-ink-2 sm:text-3xl">
                    Open-ended
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="eyebrow">Promised on</p>
              <p className="tnum mt-1.5 text-[0.95rem] font-semibold">
                {formatDate(c.promisedOn)}
              </p>
            </div>

            <div>
              <p className="eyebrow">They said</p>
              <p className="mt-1.5 text-[0.95rem] font-semibold">
                {c.deadlineLabel ? `“${c.deadlineLabel}”` : 'nothing'}
              </p>
            </div>

            {c.beneficiaries !== null && (
              <div>
                <p className="eyebrow">People affected</p>
                <p className="tnum mt-1.5 text-[0.95rem] font-semibold">
                  {formatCount(c.beneficiaries)}
                </p>
              </div>
            )}
          </div>

          {/* The window bar: how much of the promised time has burned. */}
          {c.elapsed !== null && windowMs !== null && (
            <div className="mt-6 max-w-xl">
              <div className="flex items-center justify-between text-[0.72rem] font-medium text-ink-2">
                <span>{formatDate(c.promisedOn)}</span>
                <span>
                  {roughDuration(windowMs)} window
                </span>
                <span>{formatDate(c.deadline)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, c.elapsed * 100))}%`,
                    background: style.fill,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[0.72rem] text-ink-3">
                {Math.round(Math.min(1, Math.max(0, c.elapsed)) * 100)}% of the
                promised window has been used. Verified work stands at {c.progress}%.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(0,360px)]">
        {/* ===== Left: the record ===== */}
        <div className="min-w-0 space-y-10">
          <section>
            <SectionHeading eyebrow="What was accepted" title="The commitment" />
            <Card className="p-5">
              <p className="text-[0.95rem] leading-relaxed text-ink-2">{c.detail}</p>
              <div className="mt-4 border-t pt-4">
                <p className="eyebrow">Forced onto the record by</p>
                <p className="mt-1 text-[0.9rem] font-medium">{c.demandedBy}</p>
              </div>
            </Card>
          </section>

          <section>
            <SectionHeading
              eyebrow="The receipt"
              title="Proof this was actually promised"
            >
              The half officials contest first. A signed order or an archived
              screenshot is what makes &ldquo;I never said three months&rdquo;
              unarguable.
            </SectionHeading>
            <Receipts receipts={myReceipts} />
          </section>

          <section>
            <SectionHeading
              eyebrow="Verified progress"
              title={`${c.progress}% of the work has been confirmed`}
            >
              This bar moves only when a volunteer accepts a piece of evidence. An
              official saying the work is done does not move it.
            </SectionHeading>
            <Card className="p-5">
              <ProgressBar value={c.progress} band={c.band} showLabel={false} />
              <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 text-center">
                <div>
                  <p className="display tnum text-2xl">{myProofs.length}</p>
                  <p className="mt-0.5 text-[0.72rem] text-ink-3">pieces of evidence</p>
                </div>
                <div>
                  <p
                    className="display tnum text-2xl"
                    style={{ color: BAND_STYLE.kept.softOn }}
                  >
                    {myProofs.filter((p) => p.direction === 'supports').length}
                  </p>
                  <p className="mt-0.5 text-[0.72rem] text-ink-3">say it is done</p>
                </div>
                <div>
                  <p
                    className="display tnum text-2xl"
                    style={{ color: BAND_STYLE.broken.softOn }}
                  >
                    {myProofs.filter((p) => p.direction === 'refutes').length}
                  </p>
                  <p className="mt-0.5 text-[0.72rem] text-ink-3">say it is not</p>
                </div>
              </div>
            </Card>
          </section>

          <section>
            <SectionHeading
              eyebrow="From the ground"
              title="Evidence"
            >
              Anything a resident, volunteer or reporter sent in. Nothing is taken
              on trust. Every item carries who sent it and whether it has been
              checked.
            </SectionHeading>

            <div className="space-y-3">
              {myProofs.length === 0 ? (
                <Empty
                  title="No evidence has been sent yet."
                  hint="If you can see this place, you are the first person who can settle it."
                />
              ) : (
                myProofs.map((p) => <ProofCard key={p.id} proof={p} />)
              )}
              <ProofForm commitmentId={c.id} commitmentTitle={c.title} />
            </div>
          </section>

          <section>
            <SectionHeading eyebrow="Audit trail" title="How this got here" />
            <Timeline events={c.timeline} />
          </section>

          {myComplaints.length > 0 && (
            <section>
              <SectionHeading
                eyebrow="Objections"
                title="Complaints against this promise"
                action={{ href: '/complaints', label: 'All complaints' }}
              />
              <ul className="space-y-2.5">
                {myComplaints.map((cm) => (
                  <li key={cm.id}>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-[0.92rem] font-semibold">{cm.title}</h3>
                        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-ink-2">
                          {cm.status}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[0.85rem] leading-relaxed text-ink-2">
                        {cm.body}
                      </p>
                      {cm.officialResponse && (
                        <p className="mt-3 border-l-2 pl-3 text-[0.82rem] italic text-ink-2">
                          {cm.officialResponse}
                        </p>
                      )}
                      <p className="mt-2.5 text-[0.72rem] text-ink-3">
                        {cm.filedBy} · {formatDate(cm.filedAt)} ·{' '}
                        {formatCount(cm.seconded)} seconded
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ===== Right: who is answerable ===== */}
        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
          <AccountablePanel commitment={c} emphasis />

          <WatchForm commitmentId={c.id} deadline={c.deadline} />

          <Card className="overflow-hidden">
            <p className="eyebrow border-b bg-surface-2 px-4 py-2.5">Sources</p>
            <ul className="divide-y">
              {c.sources.map((s) => (
                <li key={s.url} className="px-4 py-3">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-[0.85rem] font-semibold text-[var(--brand-ink)] hover:underline"
                  >
                    {s.publisher} ↗
                  </a>
                  <p className="mt-0.5 text-[0.72rem] uppercase tracking-wide text-ink-3">
                    {s.kind} · {formatDate(s.date)}
                  </p>
                  {s.quote && (
                    <blockquote className="mt-2 border-l-2 pl-2.5 text-[0.8rem] leading-relaxed text-ink-2">
                      “{s.quote}”
                    </blockquote>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <p className="eyebrow">Something wrong here?</p>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-2">
              If a date, a name or a claim on this page is inaccurate, file it as a
              complaint and it will be reviewed against the sources.
            </p>
            <Link
              href={`/complaints/new?commitment=${c.slug}`}
              className="mt-3 inline-block rounded-full border px-3.5 py-1.5 text-[0.8rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              File a complaint
            </Link>
          </Card>

          <p className="px-1 text-[0.7rem] leading-relaxed text-ink-3">
            Last updated {formatDateTime(c.updatedAt)}. A red state on this page
            means the deadline passed without verified proof of completion. It is a
            statement about the available evidence.
          </p>
        </aside>
      </div>
    </div>
  );
}

function ProofCard({ proof }: { proof: Proof }) {
  const supporting = proof.direction === 'supports';
  const tone = supporting ? BAND_STYLE.kept : BAND_STYLE.broken;

  const verdictTone: Record<Proof['verdict'], string> = {
    verified: BAND_STYLE.kept.softOn,
    pending: BAND_STYLE.soon.softOn,
    rejected: BAND_STYLE.unanswered.softOn,
    contested: BAND_STYLE.disputed.softOn,
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-4">
        <span
          className="w-1 shrink-0 rounded-full"
          style={{ background: tone.fill }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide"
              style={{ background: tone.soft, color: tone.softOn }}
            >
              {supporting ? 'says done' : 'says not done'}
            </span>
            <span className="text-[0.72rem] uppercase tracking-wide text-ink-3">
              {proof.kind}
            </span>
            <span
              className="ml-auto text-[0.7rem] font-semibold uppercase tracking-wide"
              style={{ color: verdictTone[proof.verdict] }}
            >
              {proof.verdict}
            </span>
          </div>

          <p className="mt-2 text-[0.88rem] leading-relaxed text-ink">{proof.claim}</p>

          {proof.mediaUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {proof.mediaUrls.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={u}
                  src={u}
                  alt=""
                  className="h-20 w-20 rounded-lg border object-cover"
                />
              ))}
            </div>
          )}

          {proof.reviewNote && (
            <p className="mt-2.5 rounded-lg bg-surface-2 px-3 py-2 text-[0.78rem] leading-relaxed text-ink-2">
              <strong className="font-semibold">
                {proof.reviewedBy ?? 'Reviewer'}:
              </strong>{' '}
              {proof.reviewNote}
            </p>
          )}

          <p className="mt-2.5 text-[0.72rem] text-ink-3">
            {proof.submittedBy} ({proof.submitterKind.replace('_', ' ')}) ·{' '}
            {formatDate(proof.submittedAt)} · {proof.corroborations} corroborations
          </p>
        </div>
      </div>
    </Card>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  const dot: Record<TimelineEvent['kind'], string> = {
    demand: 'var(--band-unanswered)',
    promise: 'var(--brand)',
    progress: 'var(--band-fresh)',
    proof: 'var(--band-kept)',
    breach: 'var(--band-broken)',
    response: 'var(--band-disputed)',
  };

  return (
    <ol className="relative space-y-5 border-l pl-6">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative">
          <span
            className="absolute -left-[1.845rem] top-1 size-2.5 rounded-full ring-4 ring-[var(--paper)]"
            style={{ background: dot[e.kind] }}
            aria-hidden
          />
          <p className="tnum text-[0.72rem] font-medium uppercase tracking-wide text-ink-3">
            {formatDateTime(e.at)}
          </p>
          <p className="mt-0.5 text-[0.92rem] font-semibold leading-snug">{e.label}</p>
          {e.detail && (
            <p className="mt-1 text-[0.83rem] leading-relaxed text-ink-2">{e.detail}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
