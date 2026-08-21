import Link from 'next/link';
import { getRegister, buildCounts } from '@/lib/data';
import { rollUp, toLive, scorecard, byUrgency, BAND_STYLE } from '@/lib/status';
import { formatCount } from '@/lib/format';
import { Mosaic, type MosaicItem } from '@/components/Mosaic';
import { CommitmentRow } from '@/components/CommitmentRow';
import { StatRibbon, PlainReading } from '@/components/KeyNumbers';
import { Legend, SectionHeading, Card } from '@/components/ui';
import type { StateRollup } from '@/lib/types';
import { graph, datasetLd } from '@/lib/jsonld';

// The whole page is a function of the clock, so it cannot be statically cached
// for long. A minute is short enough that no tile is visibly stale and long
// enough that the register is not rebuilt on every hit.
export const revalidate = 60;

export default async function HomePage() {
  const now = Date.now();
  const { commitments, proofs, complaints, receipts } = await getRegister();
  const counts = buildCounts(proofs, complaints, receipts);

  const live = commitments.map((c) => toLive(c, now, counts(c.id))).sort(byUrgency);
  const states = rollUp(commitments, now);
  const score = scorecard(live);

  const burning = live
    .filter((c) => c.msRemaining !== null && c.msRemaining > 0)
    .sort((a, b) => (a.msRemaining ?? 0) - (b.msRemaining ?? 0))
    .slice(0, 5);

  const broken = live.filter((c) => c.band === 'broken').slice(0, 4);
  const undated = live.filter((c) => c.band === 'undated');
  const unanswered = live.filter((c) => c.band === 'unanswered');

  return (
    <>
      {/* The register as a Dataset. This is what puts it in Google Dataset
          Search and tells a model the page is a structured record, not an
          article, with live counts so a quoted figure is never stale. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            graph(datasetLd({ total: score.total, kept: score.kept, broken: score.broken })),
          ),
        }}
      />
      {/* ===== Title, then the map, then the numbers ===== */}
      <section className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 sm:pt-8">
        <p className="eyebrow">Public promise register · India</p>
        <h1 className="h-page display mt-2 max-w-4xl tracking-tight">
          They promised it in front of everyone.
          <br />
          <span className="text-ink-3">Here is the clock.</span>
        </h1>

        {/* One line only. Anything longer here pushes the map down, and the map
            is the thing people came for. */}
        <p className="mt-3 max-w-3xl text-[0.92rem] leading-snug text-ink-2">
          Every tile below is one promise with a fuse on it, lit by the official
          who chose the date. Green means time left. Red means it went off and
          nobody could show the work was done.
        </p>

        {/* A single thin line of counts, so the headline numbers and the map are
            both on screen at once without the numbers displacing the map. */}
        <div className="mt-3">
          <StatRibbon
            items={[
              { value: score.total, label: 'tracked', href: '/register' },
              {
                value: score.kept,
                label: 'kept',
                tone: BAND_STYLE.kept.softOn,
                href: '/register?band=kept',
              },
              {
                value: score.broken,
                label: 'missed',
                tone: BAND_STYLE.broken.softOn,
                href: '/register?band=broken',
              },
              {
                value: score.undated + score.unanswered,
                label: 'no date given',
                tone: BAND_STYLE.undated.softOn,
                href: '/register?band=undated',
              },
              {
                value: score.dueIn48h,
                label: 'due in 48h',
                tone: BAND_STYLE.urgent.softOn,
                href: '/deadlines',
              },
              {
                value: formatCount(
                  live.reduce((s, c) => s + (c.beneficiaries ?? 0), 0),
                ),
                label: 'people affected',
                href: '/rankings',
              },
            ]}
          />
        </div>

        {/* The map, immediately. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {states.map((s) => (
            <StateBox key={s.slug} state={s} />
          ))}
        </div>

        <div className="mt-3">
          <Legend compact />
        </div>

        {/* The same figures in a sentence, for readers who take meaning from
            prose faster than from a row of digits. */}
        <div className="mt-4 max-w-4xl">
          <PlainReading
            total={score.total}
            kept={score.kept}
            broken={score.broken}
            undated={score.undated + score.unanswered}
            dueSoon={score.dueIn48h}
          />
        </div>
      </section>

      {/* ===== Everything below the map ===== */}
      <section className="mx-auto max-w-[1400px] px-4 pt-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <SectionHeading
              eyebrow="Ticking"
              title="Closest to the wire"
              action={{ href: '/deadlines', label: 'Full board' }}
            >
              Live clocks. These are the promises where someone still has time to
              act, and where showing up matters most.
            </SectionHeading>
            <ul className="space-y-2.5">
              {burning.map((c) => (
                <CommitmentRow key={c.id} c={c} live />
              ))}
            </ul>
          </div>

          <div>
            <SectionHeading
              eyebrow="Already past"
              title="Deadlines that came and went"
              action={{ href: '/register?band=broken', label: 'See all' }}
            >
              The date passed and no verified evidence of completion exists.
            </SectionHeading>
            <ul className="space-y-2.5">
              {broken.length > 0 ? (
                broken.map((c) => <CommitmentRow key={c.id} c={c} />)
              ) : (
                <li className="rounded-xl border border-dashed bg-surface-2 px-4 py-8 text-center text-sm text-ink-3">
                  Nothing has been missed yet.
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== The two quiet failure modes ===== */}
      <section className="mx-auto max-w-[1400px] px-4 pt-14 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <QuietList
            eyebrow="The quiet failure"
            title={`${undated.length} promises with no date attached`}
            blurb="A promise without a deadline can never be broken, which is exactly why it gets given. The first thing to ask about any of these is: by when?"
            href="/register?band=undated"
            items={undated.slice(0, 5)}
          />
          <QuietList
            eyebrow="No reply at all"
            title={`${unanswered.length} demands nobody has answered`}
            blurb="Raised in public, in front of witnesses, and met with silence. Silence is a result too, so it gets counted."
            href="/register?band=unanswered"
            items={unanswered.slice(0, 5)}
          />
        </div>
      </section>
    </>
  );
}

function QuietList({
  eyebrow,
  title,
  blurb,
  href,
  items,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  href: string;
  items: { id: string; slug: string; title: string; locality: string; district: string | null; state: string; accountable: { name: string }[] }[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-surface-2 px-5 py-4">
        <SectionHeading eyebrow={eyebrow} title={title} action={{ href, label: 'See all' }}>
          {blurb}
        </SectionHeading>
      </div>
      <ul className="divide-y">
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
            <Link
              href={`/p/${c.slug}`}
              className="text-[0.88rem] font-medium text-ink hover:underline"
            >
              {c.title}
            </Link>
            <span className="text-[0.75rem] text-ink-3">
              {c.locality}
              {c.district ? `, ${c.district}` : ''} · {c.state}
            </span>
            <span className="ml-auto text-[0.73rem] font-medium text-ink-3">
              {c.accountable[0]?.name ?? 'nobody named'}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function StateBox({ state }: { state: StateRollup }) {
  const items: MosaicItem[] = state.commitments.map((c) => ({
    key: c.id,
    label: c.title,
    sublabel: c.district ?? 'State-wide',
    band: c.band,
    value: Math.max(c.weight, 1) * (c.beneficiaries ? 1.15 : 1),
    progress: c.progress,
    href: `/p/${c.slug}`,
  }));

  return (
    <Card className="overflow-hidden">
      <Link
        href={`/s/${state.slug}`}
        className="flex items-start justify-between gap-2 border-b px-3.5 py-2.5 transition-colors hover:bg-surface-2"
      >
        <div className="min-w-0">
          <h3 className="text-[0.98rem] font-semibold leading-tight">{state.name}</h3>
          <p className="mt-0.5 text-[0.72rem] text-ink-3">
            {state.live} promise{state.live === 1 ? '' : 's'} ·{' '}
            {state.districts.length} district
            {state.districts.length === 1 ? '' : 's'}
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-[0.72rem] font-semibold text-ink-3">→</span>
      </Link>

      <div className="aspect-[5/4] p-1.5">
        <Mosaic items={items} />
      </div>

      <div className="flex items-center gap-2.5 border-t px-3.5 py-2 text-[0.7rem] font-medium">
        <span style={{ color: BAND_STYLE.kept.softOn }}>{state.kept} kept</span>
        <span style={{ color: BAND_STYLE.broken.softOn }}>{state.broken} missed</span>
        <span className="ml-auto truncate text-ink-3">
          {BAND_STYLE[state.band].label}
        </span>
      </div>
    </Card>
  );
}

