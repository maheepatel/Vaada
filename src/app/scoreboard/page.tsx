import Link from 'next/link';
import type { Metadata } from 'next';
import { getRegister, buildCounts } from '@/lib/data';
import { toLive, byUrgency, scorecard, BAND_STYLE, CATEGORY_LABEL } from '@/lib/status';
import {
  stateScores,
  districtScores,
  categoryScores,
  MIN_DECIDED,
  type PlaceScore,
} from '@/lib/scoreboard';
import { formatCount, percent, roughDuration } from '@/lib/format';
import { KeyNumbers } from '@/components/KeyNumbers';
import { Card, SectionHeading, BandChip, Empty } from '@/components/ui';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Scoreboard',
  description:
    'Country-wide stats, state and district rankings, and every issue raised, scored on what actually got delivered.',
};

export default async function ScoreboardPage() {
  const now = Date.now();
  const { commitments, proofs, complaints, receipts } = await getRegister();
  const counts = buildCounts(proofs, complaints, receipts);
  const live = commitments.map((c) => toLive(c, now, counts(c.id))).sort(byUrgency);

  const score = scorecard(live);
  const states = stateScores(live);
  const districts = districtScores(live);
  const categories = categoryScores(live, CATEGORY_LABEL);

  const rankedStates = states.filter((s) => !s.provisional);
  const rankedDistricts = districts.filter((d) => !d.provisional);
  const fastest = [...districts]
    .filter((d) => d.speed !== null)
    .sort((a, b) => (a.speed ?? 1) - (b.speed ?? 1));

  const openComplaints = complaints.filter((c) => c.status === 'open').length;
  const reach = live.reduce((s, c) => s + (c.beneficiaries ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-9 sm:px-6">
      <header className="max-w-3xl">
        <p className="eyebrow">Scoreboard</p>
        <h1 className="h-page display mt-2">
          Who is actually delivering
        </h1>
        <p className="mt-3 text-[0.96rem] leading-relaxed text-ink-2">
          Every number here is counted from the same rows the map is drawn from.
          Places are scored only on promises that have been <em>decided</em>, meaning
          kept, missed or disputed, because ranking somewhere on three promises
          that are all still inside their window would say nothing about anybody.
        </p>
      </header>

      <div className="mt-7">
        <KeyNumbers
          items={[
            { value: score.total, label: 'promises tracked' },
            {
              value: score.kept,
              label: 'kept & verified',
              tone: BAND_STYLE.kept.softOn,
            },
            {
              value: score.broken,
              label: 'deadline missed',
              tone: BAND_STYLE.broken.softOn,
            },
            {
              value: score.running,
              label: 'still running',
              tone: BAND_STYLE.soon.softOn,
            },
            {
              value: score.undated + score.unanswered,
              label: 'no date given',
              tone: BAND_STYLE.undated.softOn,
            },
            { value: openComplaints, label: 'open complaints', href: '/complaints' },
            { value: formatCount(reach), label: 'people affected' },
          ]}
        />
      </div>

      {/* ===== State league ===== */}
      <section className="mt-14">
        <SectionHeading
          eyebrow={
            rankedStates.length === states.length
              ? `all ${states.length} states firmly ranked`
              : `${rankedStates.length} of ${states.length} states firmly ranked · the rest marked *`
          }
          title="State league"
        >
          Scored 70% on whether promises were kept, 30% on verified movement in the
          ones still running. A place sitting still scores below one that is
          demonstrably working, even if neither has finished anything.
        </SectionHeading>
        <LeagueTable rows={states} />
      </section>

      {/* ===== District league ===== */}
      <section className="mt-14">
        <SectionHeading
          eyebrow={
            rankedDistricts.length === districts.length
              ? `all ${districts.length} districts firmly ranked`
              : `${rankedDistricts.length} of ${districts.length} districts firmly ranked · the rest marked *`
          }
          title="District league"
        >
          State-wide commitments are excluded here. They belong to no district and
          would distort whichever one they landed in.
        </SectionHeading>
        <LeagueTable rows={districts} showState />
      </section>

      {/* ===== Speed + categories ===== */}
      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Delivery speed" title="Who finishes early">
            Of the promises that were kept, how much of the agreed window had gone
            by the time evidence was accepted, taken from the audit trail rather than
            today&rsquo;s date. Lower is faster.
          </SectionHeading>
          {fastest.length === 0 ? (
            <Empty
              title="Nothing has been kept and verified yet."
              hint="Speed can only be measured on promises that were actually delivered."
            />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y">
                {fastest.map((d, i) => (
                  <li key={`${d.stateName}-${d.slug}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="tnum w-5 shrink-0 text-[0.8rem] font-bold text-ink-3">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={d.href} className="text-[0.9rem] font-semibold hover:underline">
                        {d.name}
                      </Link>
                      <p className="text-[0.72rem] text-ink-3">
                        {d.stateName} · {d.kept} kept of {d.total}
                      </p>
                    </div>
                    <div className="w-28 shrink-0">
                      <Meter value={1 - (d.speed ?? 1)} tone={BAND_STYLE.kept.fill} />
                      <p className="tnum mt-1 text-right text-[0.7rem] text-ink-3">
                        {percent(d.speed ?? 1)} of window used
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div>
          <SectionHeading eyebrow="By subject" title="What gets delivered, and what does not">
            Which kinds of promise actually land. The gap between categories is
            usually the most telling number on this page.
          </SectionHeading>
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {categories.map((c) => (
                <li key={c.category} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[0.9rem] font-semibold">{c.label}</span>
                    <span className="tnum text-[0.75rem] text-ink-3">
                      {c.total} tracked · {c.kept} kept · {c.broken} missed
                      {c.unanswered > 0 ? ` · ${c.unanswered} unanswered` : ''}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Meter
                      value={c.keptRate ?? 0}
                      tone={
                        c.keptRate === null
                          ? BAND_STYLE.undated.fill
                          : c.keptRate > 0.5
                            ? BAND_STYLE.kept.fill
                            : BAND_STYLE.broken.fill
                      }
                    />
                    <p className="mt-1 text-[0.7rem] text-ink-3">
                      {c.keptRate === null
                        ? 'nothing decided yet'
                        : `${percent(c.keptRate)} of decided promises kept`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* ===== Every issue ===== */}
      <section className="mt-14">
        <SectionHeading
          eyebrow="Country-wide"
          title="Every issue on the register"
          action={{ href: '/register', label: 'Filterable list' }}
        >
          Grouped by state, most urgent first. This is the whole record in one
          place.
        </SectionHeading>

        <div className="space-y-3">
          {states.map((s) => (
            <details key={s.slug} className="group rounded-xl border bg-surface">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className="text-[1rem] font-semibold">{s.name}</span>
                <BandChip band={s.worst} size="sm" />
                <span className="text-[0.75rem] text-ink-3">
                  {s.total} promises · {s.kept} kept · {s.broken} missed
                </span>
                <span className="ml-auto text-[0.75rem] font-semibold text-ink-3 group-open:hidden">
                  show all →
                </span>
                <span className="ml-auto hidden text-[0.75rem] font-semibold text-ink-3 group-open:inline">
                  hide
                </span>
              </summary>
              <ul className="divide-y border-t">
                {s.commitments.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: BAND_STYLE[c.band].fill }}
                      aria-hidden
                    />
                    <Link
                      href={`/p/${c.slug}`}
                      className="text-[0.87rem] font-medium hover:underline"
                    >
                      {c.title}
                    </Link>
                    <span className="text-[0.73rem] text-ink-3">
                      {c.locality}
                      {c.district ? `, ${c.district}` : ''}
                    </span>
                    <span className="ml-auto text-[0.72rem] font-medium text-ink-3">
                      {c.msRemaining === null
                        ? 'no deadline'
                        : c.msRemaining > 0
                          ? `${roughDuration(c.msRemaining)} left`
                          : `${roughDuration(c.msRemaining)} over`}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-10 max-w-3xl text-[0.78rem] leading-relaxed text-ink-3">
        A position marked <strong>*</strong> is provisional: that place has fewer
        than {MIN_DECIDED} decided promises, so its order is real but the sample is
        thin, and one more outcome could move it several places. Treat those as a
        first sketch rather than a verdict. As the register grows they firm up on
        their own.
      </p>
    </div>
  );
}

function LeagueTable({ rows, showState }: { rows: PlaceScore[]; showState?: boolean }) {
  if (rows.length === 0) return <Empty title="Nothing to rank yet." />;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-[0.85rem]">
          <thead className="bg-surface-2 text-[0.7rem] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2.5 font-semibold">#</th>
              <th className="px-3 py-2.5 font-semibold">Place</th>
              <th className="px-3 py-2.5 font-semibold">Score</th>
              <th className="px-3 py-2.5 font-semibold">Delivery</th>
              <th className="px-3 py-2.5 text-right font-semibold">Kept</th>
              <th className="px-3 py-2.5 text-right font-semibold">Missed</th>
              <th className="px-3 py-2.5 text-right font-semibold">Undated</th>
              <th className="px-3 py-2.5 text-right font-semibold">Tracked</th>
              <th className="px-3 py-2.5 text-right font-semibold">Affected</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => {
              return (
                <tr key={`${r.stateName ?? ''}-${r.slug}`}>
                  {/* Every row gets a position. Withholding it made the whole
                      table read as broken while the register is small, and the
                      order is meaningful even when the sample is not yet solid;
                      the provisional badge carries that caveat instead. */}
                  <td
                    className="tnum px-3 py-2.5 font-bold"
                    style={{ color: r.provisional ? 'var(--ink-4)' : 'var(--ink-2)' }}
                  >
                    {i + 1}
                    {r.provisional && <span aria-hidden>*</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={r.href} className="font-semibold hover:underline">
                      {r.name}
                    </Link>
                    {showState && r.stateName && (
                      <span className="block text-[0.72rem] text-ink-3">{r.stateName}</span>
                    )}
                    {r.provisional && (
                      <span className="mt-0.5 inline-block rounded bg-surface-3 px-1.5 py-0.5 text-[0.65rem] font-medium text-ink-3">
                        provisional · {r.decided} decided
                      </span>
                    )}
                  </td>
                  <td className="tnum px-3 py-2.5">
                    <span className="display text-[1.15rem]">
                      {r.score === null ? 'n/a' : r.score}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="w-28">
                      <Meter
                        value={r.keptRate ?? r.liveProgress}
                        tone={
                          r.keptRate === null
                            ? BAND_STYLE.soon.fill
                            : r.keptRate > 0.5
                              ? BAND_STYLE.kept.fill
                              : BAND_STYLE.broken.fill
                        }
                      />
                      <span className="mt-1 block text-[0.68rem] text-ink-3">
                        {r.keptRate === null
                          ? `${percent(r.liveProgress)} work verified`
                          : `${percent(r.keptRate)} kept rate`}
                      </span>
                    </div>
                  </td>
                  <td
                    className="tnum px-3 py-2.5 text-right font-semibold"
                    style={{ color: BAND_STYLE.kept.softOn }}
                  >
                    {r.kept}
                  </td>
                  <td
                    className="tnum px-3 py-2.5 text-right font-semibold"
                    style={{ color: BAND_STYLE.broken.softOn }}
                  >
                    {r.broken}
                  </td>
                  <td
                    className="tnum px-3 py-2.5 text-right"
                    style={{ color: BAND_STYLE.undated.softOn }}
                  >
                    {r.undated + r.unanswered}
                  </td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-2">{r.total}</td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-3">
                    {formatCount(r.reach)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Meter({ value, tone }: { value: number; tone: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
      role="img"
      aria-label={`${pct}%`}
    >
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
    </div>
  );
}
