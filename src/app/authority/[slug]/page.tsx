import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRegister, buildCounts } from '@/lib/data';
import { toLive, BAND_STYLE } from '@/lib/status';
import { buildAuthorities, findAuthority, officialSlug } from '@/lib/authority';
import { formatCount, percent, roughDuration } from '@/lib/format';
import { CommitmentRow } from '@/components/CommitmentRow';
import { Mosaic, type MosaicItem } from '@/components/Mosaic';
import { Card, SectionHeading, StatTile, Legend } from '@/components/ui';

export const revalidate = 60;

export async function generateStaticParams() {
  const { commitments } = await getRegister();
  const slugs = new Set(
    commitments.flatMap((c) => c.accountable.map((o) => officialSlug(o))),
  );
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/authority/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const { commitments } = await getRegister();
  const official = commitments
    .flatMap((c) => c.accountable)
    .find((o) => officialSlug(o) === slug);
  if (!official) return { title: 'Official not found' };
  return {
    title: `${official.name} — promises and record`,
    description: `Every public commitment ${official.name} (${official.role}) is answerable for, with deadlines and outcomes.`,
  };
}

export default async function AuthorityPage({
  params,
}: PageProps<'/authority/[slug]'>) {
  const { slug } = await params;
  const now = Date.now();
  const { commitments, proofs, complaints, receipts } = await getRegister();
  const counts = buildCounts(proofs, complaints, receipts);
  const live = commitments.map((c) => toLive(c, now, counts(c.id)));

  const record = findAuthority(buildAuthorities(live), slug);
  if (!record) notFound();

  const o = record.official;
  const breached = record.commitments.filter((c) => c.band === 'broken');
  const running = record.commitments.filter(
    (c) => c.msRemaining !== null && c.msRemaining > 0,
  );

  const items: MosaicItem[] = record.commitments.map((c) => ({
    key: c.id,
    label: c.title,
    sublabel: c.deadlineLabel ?? c.locality,
    band: c.band,
    value: Math.max(c.weight, 1),
    progress: c.progress,
    href: `/p/${c.slug}`,
  }));

  const places = [
    ...new Set(
      record.commitments.map((c) => `${c.district ?? 'State-wide'}, ${c.state}`),
    ),
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <nav className="mb-5 flex items-center gap-1.5 text-[0.8rem] text-ink-3">
        <Link href="/authority" className="hover:text-ink">
          Who is answerable
        </Link>
        <span>/</span>
        <span className="text-ink-2">{o.name}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="eyebrow">Accountability record</p>
        <h1 className="display mt-2 text-[2.3rem] leading-tight sm:text-[2.9rem]">
          {o.name}
        </h1>
        <p className="mt-2 text-[0.95rem] font-medium text-ink-2">
          {record.roles.join(' · ')}
          {o.body ? ` — ${o.body}` : ''}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {o.handle && (
            <span className="rounded-full bg-brand-soft px-2.5 py-1 font-mono text-[0.78rem] font-medium text-[var(--brand-ink)]">
              {o.handle}
            </span>
          )}
          {o.email ? (
            <span
              className="rounded-full px-2.5 py-1 text-[0.75rem] font-semibold"
              style={{
                background: 'var(--band-kept-soft)',
                color: 'var(--band-kept-ink)',
              }}
            >
              Breach notices can be delivered
              {o.contactSource ? ` · source: ${o.contactSource}` : ''}
            </span>
          ) : (
            <span
              className="rounded-full px-2.5 py-1 text-[0.75rem] font-semibold"
              style={{
                background: 'var(--band-urgent-soft)',
                color: 'var(--band-urgent-ink)',
              }}
            >
              No verified contact on file — notices cannot be sent
            </span>
          )}
        </div>

        {places.length > 0 && (
          <p className="mt-3 text-[0.85rem] text-ink-3">
            Answerable in {places.join(' · ')}
          </p>
        )}
      </header>

      <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        <StatTile label="Promises owned" value={record.commitments.length} />
        <StatTile label="Kept" value={record.kept} accent={BAND_STYLE.kept.softOn} />
        <StatTile
          label="Missed"
          value={record.broken}
          accent={BAND_STYLE.broken.softOn}
        />
        <StatTile
          label="Kept rate"
          value={record.keptRate === null ? '—' : percent(record.keptRate)}
          hint="of decided promises"
        />
        <StatTile
          label="People affected"
          value={formatCount(record.reach)}
          hint="across everything they own"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-3">
          <Card className="overflow-hidden">
            <div className="aspect-square p-1.5">
              <Mosaic items={items} minLabelArea={30} />
            </div>
          </Card>
          <div className="rounded-xl border bg-surface px-4 py-3">
            <Legend />
          </div>

          {record.nextDeadlineMs !== null && (
            <Card className="p-4">
              <p className="eyebrow">Next deadline</p>
              <p className="display mt-1 text-2xl">
                {roughDuration(record.nextDeadlineMs)}
              </p>
              <p className="mt-1 text-[0.78rem] text-ink-3">
                {running.length} promise{running.length === 1 ? '' : 's'} still
                inside the window they were given.
              </p>
            </Card>
          )}

          <Card className="p-4">
            <p className="eyebrow">About this page</p>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-2">
              Every row is a commitment this office accepted in public, traceable
              to a source. Where a promise was accepted jointly, it counts
              against each name — so that no one can point at the other.
            </p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-2">
              &ldquo;Missed&rdquo; means the deadline passed with no verified proof of
              completion on this register. If the work was done, one photograph
              corrects it.
            </p>
          </Card>
        </div>

        <div className="min-w-0 space-y-10">
          {breached.length > 0 && (
            <section>
              <SectionHeading
                eyebrow={`${breached.length} outstanding`}
                title="Deadlines that passed"
              >
                No verified evidence of completion exists for these.
              </SectionHeading>
              <ul className="space-y-2.5">
                {breached.map((c) => (
                  <CommitmentRow key={c.id} c={c} />
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionHeading
              eyebrow="The full record"
              title={`Everything ${o.name} is answerable for`}
            />
            <ul className="space-y-2.5">
              {record.commitments.map((c) => (
                <CommitmentRow key={c.id} c={c} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
