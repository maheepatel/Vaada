import Link from 'next/link';
import type { Metadata } from 'next';
import { getRegister } from '@/lib/data';
import { CATEGORY_LABEL, BAND_STYLE } from '@/lib/status';
import { formatDate, formatCount, titleFromSlug } from '@/lib/format';
import { Card, SectionHeading, StatTile, Empty } from '@/components/ui';
import type { Complaint, ComplaintStatus } from '@/lib/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Complaints',
  description:
    'Complaints filed by residents about promises that are not matching what they can see on the ground.',
};

const STATUS_TONE: Record<ComplaintStatus, { bg: string; fg: string; label: string }> = {
  open: {
    bg: BAND_STYLE.broken.soft,
    fg: BAND_STYLE.broken.softOn,
    label: 'Open, no response yet',
  },
  acknowledged: {
    bg: BAND_STYLE.soon.soft,
    fg: BAND_STYLE.soon.softOn,
    label: 'Acknowledged',
  },
  resolved: {
    bg: BAND_STYLE.kept.soft,
    fg: BAND_STYLE.kept.softOn,
    label: 'Resolved',
  },
  rejected: {
    bg: BAND_STYLE.unanswered.soft,
    fg: BAND_STYLE.unanswered.softOn,
    label: 'Rejected',
  },
};

export default async function ComplaintsPage() {
  const { complaints, commitments } = await getRegister();

  const bySlug = new Map(commitments.map((c) => [c.id, c] as const));
  const sorted = [...complaints].sort((a, b) => {
    // Unanswered first, then by how many people have seconded it.
    const openness = Number(b.status === 'open') - Number(a.status === 'open');
    return openness !== 0 ? openness : b.seconded - a.seconded;
  });

  const open = sorted.filter((c) => c.status === 'open');
  const answered = sorted.filter((c) => c.status !== 'open');
  const totalSeconded = complaints.reduce((s, c) => s + c.seconded, 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="eyebrow">Complaints register</p>
        <h1 className="h-page display mt-2">
          What people are actually seeing
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
          A promise can be marked done on paper and still be nothing on the ground.
          These are the objections residents have filed, either against a specific
          commitment or about something nobody has promised anything about yet.
        </p>
        <Link
          href="/complaints/new"
          className="mt-5 inline-block rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper transition-opacity hover:opacity-85"
        >
          File a complaint
        </Link>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile label="Filed" value={complaints.length} />
        <StatTile
          label="Still unanswered"
          value={open.length}
          accent={BAND_STYLE.broken.softOn}
        />
        <StatTile
          label="Acknowledged"
          value={complaints.filter((c) => c.status === 'acknowledged').length}
          accent={BAND_STYLE.soon.softOn}
        />
        <StatTile
          label="People backing them"
          value={formatCount(totalSeconded)}
          hint="said the same thing is happening to them"
        />
      </div>

      <section className="mt-12">
        <SectionHeading
          eyebrow={`${open.length} waiting`}
          title="No official response yet"
        />
        {open.length === 0 ? (
          <Empty title="Every complaint has had a response." />
        ) : (
          <ul className="space-y-3">
            {open.map((c) => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                commitmentSlug={
                  c.commitmentId ? bySlug.get(c.commitmentId)?.slug : undefined
                }
                commitmentTitle={
                  c.commitmentId ? bySlug.get(c.commitmentId)?.title : undefined
                }
              />
            ))}
          </ul>
        )}
      </section>

      {answered.length > 0 && (
        <section className="mt-12">
          <SectionHeading eyebrow="Handled" title="Answered or closed" />
          <ul className="space-y-3">
            {answered.map((c) => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                commitmentSlug={
                  c.commitmentId ? bySlug.get(c.commitmentId)?.slug : undefined
                }
                commitmentTitle={
                  c.commitmentId ? bySlug.get(c.commitmentId)?.title : undefined
                }
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ComplaintCard({
  complaint: c,
  commitmentSlug,
  commitmentTitle,
}: {
  complaint: Complaint;
  commitmentSlug?: string;
  commitmentTitle?: string;
}) {
  const tone = STATUS_TONE[c.status];

  return (
    <li>
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-[1rem] font-semibold leading-snug">{c.title}</h3>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold"
              style={{ background: tone.bg, color: tone.fg }}
            >
              {tone.label}
            </span>
          </div>

          <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-2">{c.body}</p>

          {commitmentSlug && (
            <Link
              href={`/p/${commitmentSlug}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[0.78rem] font-medium text-ink-2 hover:text-ink"
            >
              <span className="text-ink-4">against</span> {commitmentTitle} →
            </Link>
          )}

          {c.officialResponse && (
            <div className="mt-3 rounded-lg border-l-2 bg-surface-2 px-3 py-2.5">
              <p className="eyebrow">Official response</p>
              <p className="mt-1 text-[0.83rem] leading-relaxed text-ink-2">
                {c.officialResponse}
              </p>
              {c.respondedAt && (
                <p className="mt-1 text-[0.72rem] text-ink-3">
                  {formatDate(c.respondedAt)}
                </p>
              )}
            </div>
          )}

          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.73rem] text-ink-3">
            <span className="font-medium text-ink-2">{c.filedBy}</span>
            <span>{formatDate(c.filedAt)}</span>
            <span>{CATEGORY_LABEL[c.category]}</span>
            <Link
              href={
                c.districtSlug
                  ? `/s/${c.stateSlug}/${c.districtSlug}`
                  : `/s/${c.stateSlug}`
              }
              className="hover:text-ink"
            >
              {c.districtSlug ? `${titleFromSlug(c.districtSlug)}, ` : ''}
              {titleFromSlug(c.stateSlug)}
            </Link>
            <span className="ml-auto font-semibold text-ink-2">
              {formatCount(c.seconded)} said the same
            </span>
          </div>
        </div>
      </Card>
    </li>
  );
}
