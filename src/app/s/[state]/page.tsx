import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRegister } from '@/lib/data';
import { rollUp, scorecard, BAND_STYLE } from '@/lib/status';
import { formatCount, percent } from '@/lib/format';
import { Mosaic, type MosaicItem } from '@/components/Mosaic';
import { CommitmentRow } from '@/components/CommitmentRow';
import { Card, Legend, SectionHeading } from '@/components/ui';
import { StatRibbon } from '@/components/KeyNumbers';
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
    title: match.state,
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

      <header className="max-w-4xl">
        <p className="eyebrow">State register</p>
        <h1 className="h-page display mt-2">
          {state.name}
        </h1>
        <p className="mt-2 text-[0.92rem] leading-snug text-ink-2">
          {state.live} promises across {state.districts.length} district
          {state.districts.length === 1 ? '' : 's'}
          {affected > 0 ? `, affecting about ${formatCount(affected)} people` : ''}. One
          box per district. Click into it for the full record.
        </p>
      </header>

      {/* Counts as a single thin line, so the district boxes stay directly
          under the title rather than being pushed down by a block of tiles. */}
      <div className="mt-3">
        <StatRibbon
          items={[
            { value: score.total, label: 'tracked' },
            { value: score.kept, label: 'kept', tone: BAND_STYLE.kept.softOn },
            { value: score.broken, label: 'missed', tone: BAND_STYLE.broken.softOn },
            {
              value: score.undated + score.unanswered,
              label: 'no date given',
              tone: BAND_STYLE.undated.softOn,
            },
            { value: score.dueIn48h, label: 'due in 48h', tone: BAND_STYLE.urgent.softOn },
            {
              value:
                score.kept + score.broken + score.disputed > 0
                  ? percent(score.keptRate)
                  : 'n/a',
              label: 'kept rate',
            },
          ]}
        />
      </div>

      {/* The map, immediately. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {state.districts.map((d) => (
          <DistrictBox key={d.slug} district={d} stateSlug={state.slug} />
        ))}
      </div>

      <div className="mt-3">
        <Legend compact />
      </div>

      <section className="mt-14">
        <SectionHeading
          eyebrow="Full list"
          title={`Every promise in ${state.name}`}
        >
          Sorted by urgency. Whatever is closest to breaking sits at the top.
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
        className="flex items-start justify-between gap-2 border-b px-3.5 py-2.5 transition-colors hover:bg-surface-2"
      >
        <div className="min-w-0">
          <h3 className="text-[0.98rem] font-semibold leading-tight">
            {district.name}
          </h3>
          <p className="mt-0.5 truncate text-[0.72rem] text-ink-3">
            {district.live} promise{district.live === 1 ? '' : 's'} ·{' '}
            {district.commitments[0]?.locality}
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-[0.72rem] font-semibold text-ink-3">→</span>
      </Link>

      <div className="aspect-[5/4] p-1.5">
        <Mosaic items={items} />
      </div>

      <div className="flex items-center gap-2.5 border-t px-3.5 py-2 text-[0.7rem] font-medium">
        <span style={{ color: BAND_STYLE.kept.softOn }}>{district.kept} kept</span>
        <span style={{ color: BAND_STYLE.broken.softOn }}>
          {district.broken} missed
        </span>
        <span className="ml-auto truncate text-ink-3">
          {BAND_STYLE[district.band].label}
        </span>
      </div>
    </Card>
  );
}
