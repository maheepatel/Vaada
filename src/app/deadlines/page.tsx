import Link from 'next/link';
import type { Metadata } from 'next';
import { getRegister } from '@/lib/data';
import { toLive, scorecard, BAND_STYLE } from '@/lib/status';
import { formatDate, formatCount } from '@/lib/format';
import { Countdown } from '@/components/Countdown';
import { CommitmentRow } from '@/components/CommitmentRow';
import { Card, SectionHeading, StatTile, Empty, BandChip } from '@/components/ui';
import type { LiveCommitment } from '@/lib/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Deadline board',
  description:
    'Live countdowns on every dated promise, sorted by how little time is left.',
};

/** Buckets the board is organised into, in the order a reader should scan them. */
const HORIZONS = [
  { key: 'today', label: 'Inside 24 hours', max: 86_400_000 },
  { key: 'week', label: 'This week', max: 7 * 86_400_000 },
  { key: 'month', label: 'This month', max: 31 * 86_400_000 },
  { key: 'later', label: 'Further out', max: Infinity },
] as const;

export default async function DeadlinesPage() {
  const now = Date.now();
  const { commitments } = await getRegister();
  const live = commitments.map((c) => toLive(c, now));
  const score = scorecard(live);

  const upcoming = live
    .filter((c) => c.msRemaining !== null && c.msRemaining > 0)
    .sort((a, b) => (a.msRemaining ?? 0) - (b.msRemaining ?? 0));

  const overdue = live
    .filter((c) => c.band === 'broken')
    .sort((a, b) => (a.msRemaining ?? 0) - (b.msRemaining ?? 0));

  const undated = live.filter((c) => c.band === 'undated' || c.band === 'unanswered');

  const buckets = HORIZONS.map((h, i) => {
    const min = i === 0 ? 0 : HORIZONS[i - 1].max;
    return {
      ...h,
      items: upcoming.filter(
        (c) => (c.msRemaining ?? 0) > min && (c.msRemaining ?? 0) <= h.max,
      ),
    };
  });

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="eyebrow">Deadline board</p>
        <h1 className="h-page display mt-2">
          What runs out next
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
          Every dated promise, ordered by how little time is left on it. The top of
          this page is where showing up, asking, or photographing something still
          changes the outcome.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile
          label="Due in 48 hours"
          value={score.dueIn48h}
          accent={BAND_STYLE.urgent.softOn}
        />
        <StatTile label="Running" value={upcoming.length} />
        <StatTile
          label="Already overdue"
          value={overdue.length}
          accent={BAND_STYLE.broken.softOn}
        />
        <StatTile
          label="Untrackable"
          value={undated.length}
          accent={BAND_STYLE.undated.softOn}
          hint="no date was ever given"
        />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_minmax(0,400px)]">
        <div className="min-w-0 space-y-10">
          {buckets.map((b) => (
            <section key={b.key}>
              <SectionHeading
                eyebrow={`${b.items.length} promise${b.items.length === 1 ? '' : 's'}`}
                title={b.label}
              />
              {b.items.length === 0 ? (
                <Empty title="Nothing in this window." />
              ) : (
                <div className="space-y-2.5">
                  {b.items.map((c) => (
                    <DeadlineCard key={c.id} c={c} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
          <section>
            <SectionHeading
              eyebrow="Past the date"
              title="Overdue"
              action={{ href: '/register?band=broken', label: 'In register' }}
            >
              No verified proof of completion exists for these.
            </SectionHeading>
            {overdue.length === 0 ? (
              <Empty title="Nothing overdue." />
            ) : (
              <ul className="space-y-2.5">
                {overdue.map((c) => (
                  <CommitmentRow key={c.id} c={c} />
                ))}
              </ul>
            )}
          </section>

          <Card className="p-4">
            <p className="eyebrow">Why the colours move</p>
            <p className="mt-2 text-[0.83rem] leading-relaxed text-ink-2">
              A tile is green while most of the promised window is still ahead, and
              slides through yellow and orange as it is spent. A 48-hour promise
              therefore turns orange in a day; a three-month promise takes ten
              weeks. The colour is about the <em>window that was agreed</em>, not
              about how hard the work is.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/**
 * A full-width deadline card with a live clock. Heavier than a register row
 * because this is the page people leave open on a second screen.
 */
function DeadlineCard({ c }: { c: LiveCommitment }) {
  const style = BAND_STYLE[c.band];
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
        <span
          className="h-1 w-full shrink-0 rounded-full sm:h-14 sm:w-1"
          style={{ background: style.fill }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/p/${c.slug}`}
            className="text-[1rem] font-semibold leading-snug hover:underline"
          >
            {c.title}
          </Link>
          <p className="mt-1 text-[0.8rem] text-ink-3">
            {c.locality}
            {c.district ? `, ${c.district}` : ''} · {c.state} · due{' '}
            {formatDate(c.deadline)}
            {c.beneficiaries ? ` · ${formatCount(c.beneficiaries)} affected` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BandChip band={c.band} size="sm" />
            {c.accountable[0] && (
              <span className="text-[0.73rem] text-ink-3">
                owed by {c.accountable[0].name}
                {c.accountable[0].handle ? ` (${c.accountable[0].handle})` : ''}
              </span>
            )}
          </div>
        </div>
        {c.deadline && c.msRemaining !== null && (
          <div className="shrink-0 sm:text-right">
            <Countdown
              deadline={c.deadline}
              initialMs={c.msRemaining}
              band={c.band}
              size="md"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
