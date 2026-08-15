import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRegister } from '@/lib/data';
import { rollUp, scorecard, BAND_STYLE, CATEGORY_LABEL } from '@/lib/status';
import { formatCount, formatDate } from '@/lib/format';
import { Mosaic, type MosaicItem } from '@/components/Mosaic';
import { CommitmentRow } from '@/components/CommitmentRow';
import { Card, Legend, SectionHeading, StatTile, Empty } from '@/components/ui';

export const revalidate = 60;

export async function generateStaticParams() {
  const { commitments } = await getRegister();
  const seen = new Set<string>();
  const out: { state: string; district: string }[] = [];
  for (const c of commitments) {
    const district = c.districtSlug ?? '_statewide';
    const key = `${c.stateSlug}/${district}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ state: c.stateSlug, district });
  }
  return out;
}

export async function generateMetadata({
  params,
}: PageProps<'/s/[state]/[district]'>): Promise<Metadata> {
  const { state, district } = await params;
  const { commitments } = await getRegister();
  const roll = rollUp(commitments, Date.now()).find((s) => s.slug === state);
  const d = roll?.districts.find((x) => x.slug === district);
  if (!roll || !d) return { title: 'District not found' };
  return {
    title: `${d.name}, ${roll.name} — promises and deadlines`,
    description: `${d.live} public commitments logged in ${d.name}, ${roll.name}, with deadlines and citizen evidence.`,
  };
}

export default async function DistrictPage({
  params,
}: PageProps<'/s/[state]/[district]'>) {
  const { state: stateSlug, district: districtSlug } = await params;
  const now = Date.now();
  const { commitments, complaints } = await getRegister();

  const state = rollUp(commitments, now).find((s) => s.slug === stateSlug);
  const district = state?.districts.find((d) => d.slug === districtSlug);
  if (!state || !district) notFound();

  const score = scorecard(district.commitments);
  const localComplaints = complaints.filter(
    (c) => c.stateSlug === stateSlug && c.districtSlug === districtSlug,
  );

  const items: MosaicItem[] = district.commitments.map((c) => ({
    key: c.id,
    label: c.title,
    sublabel: c.deadlineLabel ?? 'no deadline',
    band: c.band,
    value: Math.max(c.weight, 1),
    progress: c.progress,
    href: `/p/${c.slug}`,
  }));

  const officials = [
    ...new Map(
      district.commitments
        .flatMap((c) => c.accountable)
        .map((o) => [o.name, o] as const),
    ).values(),
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[0.8rem] text-ink-3">
        <Link href="/" className="hover:text-ink">Map</Link>
        <span>/</span>
        <Link href={`/s/${state.slug}`} className="hover:text-ink">{state.name}</Link>
        <span>/</span>
        <span className="text-ink-2">{district.name}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="eyebrow">{state.name} · district register</p>
        <h1 className="display mt-2 text-[2.3rem] leading-tight sm:text-[2.9rem]">
          {district.name}
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
          {district.live} promise{district.live === 1 ? '' : 's'} logged here. Every
          tile is one commitment; its colour is how much of the promised window has
          already been spent.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div>
          <Card className="overflow-hidden">
            <div className="aspect-square p-1.5">
              <Mosaic items={items} minLabelArea={30} />
            </div>
          </Card>
          <div className="mt-3 rounded-xl border bg-surface px-4 py-3">
            <Legend />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <StatTile label="Kept" value={score.kept} accent={BAND_STYLE.kept.softOn} />
            <StatTile
              label="Missed"
              value={score.broken}
              accent={BAND_STYLE.broken.softOn}
            />
            <StatTile
              label="Running"
              value={score.running}
              accent={BAND_STYLE.soon.softOn}
            />
            <StatTile
              label="Undated"
              value={score.undated + score.unanswered}
              accent={BAND_STYLE.undated.softOn}
            />
          </div>

          {officials.length > 0 && (
            <Card className="mt-3 overflow-hidden">
              <p className="eyebrow border-b bg-surface-2 px-4 py-2.5">
                Answerable here
              </p>
              <ul className="divide-y">
                {officials.map((o) => (
                  <li key={o.name} className="px-4 py-2.5">
                    <p className="text-[0.85rem] font-medium">{o.name}</p>
                    <p className="text-[0.73rem] text-ink-3">
                      {o.role}
                      {o.body ? ` · ${o.body}` : ''}
                    </p>
                    {o.handle && (
                      <p className="mt-0.5 font-mono text-[0.72rem] text-[var(--brand-ink)]">
                        {o.handle}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="min-w-0">
          <SectionHeading eyebrow="The record" title="Promises made here" />
          <ul className="space-y-2.5">
            {district.commitments.map((c) => (
              <CommitmentRow key={c.id} c={c} showPlace={false} />
            ))}
          </ul>

          <section className="mt-12">
            <SectionHeading
              eyebrow="From residents"
              title={`Complaints filed in ${district.name}`}
              action={{ href: '/complaints/new', label: 'File one' }}
            />
            {localComplaints.length === 0 ? (
              <Empty
                title="No complaints filed here yet."
                hint="If something on this list is not matching what you can see on the ground, say so."
              />
            ) : (
              <ul className="space-y-2.5">
                {localComplaints.map((c) => (
                  <li key={c.id}>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-[0.92rem] font-semibold">{c.title}</h3>
                        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-ink-2">
                          {c.status}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[0.85rem] leading-relaxed text-ink-2">
                        {c.body}
                      </p>
                      <p className="mt-2.5 text-[0.72rem] text-ink-3">
                        {c.filedBy} · {formatDate(c.filedAt)} ·{' '}
                        {formatCount(c.seconded)} people said the same ·{' '}
                        {CATEGORY_LABEL[c.category]}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
