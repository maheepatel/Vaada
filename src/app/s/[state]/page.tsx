import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRegister } from '@/lib/data';
import { rollUp, scorecard, BAND_STYLE } from '@/lib/status';
import { formatCount, percent } from '@/lib/format';
import { Mosaic, type MosaicItem } from '@/components/Mosaic';
import { CommitmentRow } from '@/components/CommitmentRow';
import { Card, Legend, SectionHeading, StatTile } from '@/components/ui';
import type { DistrictRollup } from '@/lib/types';

export const revalidate = 60;

export async function generateStaticParams() {
  const { commitments } = await getRegister();
  return [...new Set(commitments.map((c) => c.stateSlug))].map((state) => ({ state }));
}

export async function generateMetadata({
  params,
}: PageProps<'/s/[state]'>): Promise<Metadata> {
  const { state } = await params;
  const { commitments } = await getRegister();
  const match = commitments.find((c) => c.stateSlug === state);
  if (!match) return { title: 'State not found' };
  return {
    title: `${match.state} — promises and deadlines`,
    description: `Every public commitment logged in ${match.state}, by district, with the deadline each official agreed to.`,
  };
}

export default async function StatePage({ params }: PageProps<'/s/[state]'>) {
  const { state: stateSlug } = await params;
  const now = Date.now();
  const { commitments } = await getRegister();

  const state = rollUp(commitments, now).find((s) => s.slug === stateSlug);
  if (!state) notFound();

  const score = scorecard(state.commitments);
  const affected = state.commitments.reduce((s, c) => s + (c.beneficiaries ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <nav className="mb-5 flex items-center gap-1.5 text-[0.8rem] text-ink-3">
        <Link href="/" className="hover:text-ink">
          Map
        </Link>
        <span>/</span>
        <span className="text-ink-2">{state.name}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="eyebrow">State register</p>
        <h1 className="display mt-2 text-[2.3rem] leading-tight sm:text-[2.9rem]">
          {state.name}
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
          {state.live} promises logged across {state.districts.length} district
          {state.districts.length === 1 ? '' : 's'}
          {affected > 0 ? `, affecting about ${formatCount(affected)} people` : ''}. Each
          box below is one district; click into it for the full record.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        <StatTile label="Tracked" value={score.total} />
        <StatTile label="Kept" value={score.kept} accent={BAND_STYLE.kept.softOn} />
        <StatTile
          label="Missed"
          value={score.broken}
          accent={BAND_STYLE.broken.softOn}
        />
        <StatTile
          label="Undated"
          value={score.undated + score.unanswered}
          accent={BAND_STYLE.undated.softOn}
        />
        <StatTile
          label="Kept rate"
          value={
            score.kept + score.broken + score.disputed > 0
              ? percent(score.keptRate)
              : '—'
          }
          hint="of decided promises"
        />
      </div>

      <div className="my-8 rounded-xl border bg-surface px-4 py-3">
        <Legend />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.districts.map((d) => (
          <DistrictBox key={d.slug} district={d} stateSlug={state.slug} />
        ))}
      </div>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Full list"
          title={`Every promise in ${state.name}`}
        >
          Sorted by urgency — whatever is closest to breaking sits at the top.
        </SectionHeading>
        <ul className="space-y-2.5">
          {state.commitments.map((c) => (
            <CommitmentRow key={c.id} c={c} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function DistrictBox({
  district,
  stateSlug,
}: {
  district: DistrictRollup;
  stateSlug: string;
}) {
  const items: MosaicItem[] = district.commitments.map((c) => ({
    key: c.id,
    label: c.title,
    sublabel: c.deadlineLabel ?? c.locality,
    band: c.band,
    value: Math.max(c.weight, 1),
    progress: c.progress,
    href: `/p/${c.slug}`,
  }));

  return (
    <Card className="overflow-hidden">
      <Link
        href={`/s/${stateSlug}/${district.slug}`}
        className="flex items-start justify-between gap-3 border-b px-4 py-3 transition-colors hover:bg-surface-2"
      >
        <div className="min-w-0">
          <h3 className="text-[1.05rem] font-semibold leading-tight">
            {district.name}
          </h3>
          <p className="mt-0.5 text-[0.75rem] text-ink-3">
            {district.live} promise{district.live === 1 ? '' : 's'} ·{' '}
            {district.commitments[0]?.locality}
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-[0.75rem] font-semibold text-ink-3">→</span>
      </Link>

      <div className="aspect-square p-1.5">
        <Mosaic items={items} />
      </div>

      <div className="flex items-center gap-3 border-t px-4 py-2.5 text-[0.72rem] font-medium">
        <span style={{ color: BAND_STYLE.kept.softOn }}>{district.kept} kept</span>
        <span style={{ color: BAND_STYLE.broken.softOn }}>
          {district.broken} missed
        </span>
        <span className="ml-auto text-ink-3">
          worst: {BAND_STYLE[district.band].label}
        </span>
      </div>
    </Card>
  );
}
