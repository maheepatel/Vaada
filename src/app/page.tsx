import Link from 'next/link';
import { getRegister, countBy } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import { rollUp, toLive, scorecard, byUrgency, BAND_STYLE } from '@/lib/status';
import { formatCount, percent } from '@/lib/format';
import { Mosaic, type MosaicItem } from '@/components/Mosaic';
import { CommitmentRow } from '@/components/CommitmentRow';
import { Legend, SectionHeading, StatTile, Card } from '@/components/ui';
import type { StateRollup } from '@/lib/types';

// The whole page is a function of the clock, so it cannot be statically cached
// for long. A minute is short enough that no tile is visibly stale and long
// enough that the register is not rebuilt on every hit.
export const revalidate = 60;

export default async function HomePage() {
  const now = Date.now();
  const { commitments, proofs, complaints } = await getRegister();

  const proofCounts = countBy(proofs, (p) => p.commitmentId);
  const complaintCounts = countBy(
    complaints.filter((c) => c.commitmentId),
    (c) => c.commitmentId as string,
  );

  const live = commitments
    .map((c) =>
      toLive(c, now, {
        proofs: proofCounts.get(c.id),
        complaints: complaintCounts.get(c.id),
      }),
    )
    .sort(byUrgency);

  const states = rollUp(commitments, now);
  const score = scorecard(live);

  const burning = live
    .filter((c) => c.msRemaining !== null && c.msRemaining > 0)
    .sort((a, b) => (a.msRemaining ?? 0) - (b.msRemaining ?? 0))
    .slice(0, 5);

  const broken = live.filter((c) => c.band === 'broken').slice(0, 4);
  const undated = live.filter((c) => c.band === 'undated');

  return (
    <>
      {!isSupabaseConfigured() && <SeedBanner />}

      <section className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="max-w-3xl">
          <p className="eyebrow">Public promise register · India</p>
          <h1 className="display mt-3 text-[2.4rem] leading-[1.06] tracking-tight sm:text-[3.4rem]">
            They promised it in front of everyone.
            <br />
            <span className="text-ink-3">Here is the clock.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[0.98rem] leading-relaxed text-ink-2 sm:text-[1.05rem]">
            Every tile below is one thing a named official agreed to do, in one
            place, by a date they chose themselves. Tiles start green and turn red
            as the window they promised runs out. When one goes red, the deadline
            passed with nobody able to show that the work was done.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href="/deadlines"
              className="rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper transition-opacity hover:opacity-85"
            >
              What is about to break
            </Link>
            <Link
              href="/submit"
              className="rounded-full border px-4 py-2 text-[0.85rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Log a promise from a post
            </Link>
          </div>
        </div>

        {/* Scorecard */}
        <div className="mt-9 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
          <StatTile
            label="Promises tracked"
            value={score.total}
            hint={`across ${states.length} states`}
          />
          <StatTile
            label="Kept & verified"
            value={score.kept}
            accent={BAND_STYLE.kept.softOn}
            hint={
              score.kept + score.broken + score.disputed > 0
                ? `${percent(score.keptRate)} of decided promises`
                : 'nothing decided yet'
            }
          />
          <StatTile
            label="Deadline missed"
            value={score.broken}
            accent={BAND_STYLE.broken.softOn}
            hint="no verified proof by the date"
          />
          <StatTile
            label="No date given"
            value={score.undated + score.unanswered}
            accent={BAND_STYLE.undated.softOn}
            hint="accepted or raised, never dated"
          />
          <StatTile
            label="Due in 48 hours"
            value={score.dueIn48h}
            accent={BAND_STYLE.urgent.softOn}
            hint="go and look now"
          />
        </div>
      </section>

      {/* ===== The map ===== */}
      <section className="mx-auto max-w-[1400px] px-4 pt-14 sm:px-6">
        <SectionHeading eyebrow="The map" title="Every promise, by where it was made">
          One box per state. Inside it, one tile per promise, sized by how many
          people it affects. Click into a state for its districts.
        </SectionHeading>

        <div className="mb-6 rounded-xl border bg-surface px-4 py-3">
          <Legend />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {states.map((s) => (
            <StateBox key={s.slug} state={s} />
          ))}
        </div>
      </section>

      {/* ===== Burning down ===== */}
      <section className="mx-auto max-w-[1400px] px-4 pt-16 sm:px-6">
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

      {/* ===== Undated ===== */}
      <section className="mx-auto max-w-[1400px] px-4 pt-16 sm:px-6">
        <Card className="overflow-hidden">
          <div className="border-b bg-surface-2 px-5 py-4">
            <SectionHeading
              eyebrow="The quiet failure"
              title={`${undated.length} promises with no date attached`}
              action={{ href: '/register?band=undated', label: 'See all' }}
            >
              A promise without a deadline can never be broken, which is exactly
              why it gets given. These are logged so that the first ask is always:
              by when?
            </SectionHeading>
          </div>
          <ul className="divide-y">
            {undated.slice(0, 5).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <Link
                  href={`/p/${c.slug}`}
                  className="text-[0.9rem] font-medium text-ink hover:underline"
                >
                  {c.title}
                </Link>
                <span className="text-[0.78rem] text-ink-3">
                  {c.locality}
                  {c.district ? `, ${c.district}` : ''} · {c.state}
                </span>
                <span className="ml-auto text-[0.75rem] font-medium text-ink-3">
                  {c.accountable[0]?.name ?? 'unassigned'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </>
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

  const affected = state.commitments.reduce((s, c) => s + (c.beneficiaries ?? 0), 0);

  return (
    <Card className="overflow-hidden">
      <Link
        href={`/s/${state.slug}`}
        className="flex items-start justify-between gap-3 border-b px-4 py-3 transition-colors hover:bg-surface-2"
      >
        <div className="min-w-0">
          <h3 className="text-[1.05rem] font-semibold leading-tight">{state.name}</h3>
          <p className="mt-0.5 text-[0.75rem] text-ink-3">
            {state.districts.length} district
            {state.districts.length === 1 ? '' : 's'} · {state.live} promise
            {state.live === 1 ? '' : 's'}
            {affected > 0 ? ` · ${formatCount(affected)} affected` : ''}
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-[0.75rem] font-semibold text-ink-3">→</span>
      </Link>

      <div className="aspect-[4/3] p-1.5">
        <Mosaic items={items} />
      </div>

      <div className="flex items-center gap-3 border-t px-4 py-2.5 text-[0.72rem] font-medium">
        <span style={{ color: BAND_STYLE.kept.softOn }}>{state.kept} kept</span>
        <span style={{ color: BAND_STYLE.broken.softOn }}>{state.broken} missed</span>
        <span className="ml-auto text-ink-3">
          worst: {BAND_STYLE[state.band].label}
        </span>
      </div>
    </Card>
  );
}

function SeedBanner() {
  return (
    <div className="border-b bg-brand-soft">
      <p className="mx-auto max-w-[1400px] px-4 py-2 text-[0.78rem] text-[var(--brand-ink)] sm:px-6">
        <strong className="font-semibold">Reading from the founding register.</strong>{' '}
        Supabase is not configured, so submissions are validated but not stored.
        Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable
        writes.
      </p>
    </div>
  );
}
