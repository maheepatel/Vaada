import type { Metadata } from 'next';
import { BAND_STYLE, RAMP, bandTexture } from '@/lib/status';
import { Card, Legend } from '@/components/ui';
import type { UrgencyBand } from '@/lib/types';

export const metadata: Metadata = {
  title: 'How this works',
  description:
    'What counts as a promise, how the colours are calculated, and what has to happen before a tile turns green.',
};

const BANDS: UrgencyBand[] = [
  'kept',
  'fresh',
  'soon',
  'urgent',
  'critical',
  'broken',
  'disputed',
  'undated',
  'unanswered',
];

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-10 sm:px-6">
      <header>
        <p className="eyebrow">Method</p>
        <h1 className="h-page display mt-2">
          How a tile gets its colour
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
          This register is only useful if it is boring and checkable. Everything
          below is the whole rule set. There is nothing else behind it.
        </p>
      </header>

      <section className="mt-10 space-y-4">
        <h2 className="display text-xl">What counts as a promise</h2>
        <p className="text-[0.92rem] leading-relaxed text-ink-2">
          One row is created when a person with authority states in public that a
          specific thing will be done in a specific place. Aspirations do not
          qualify. &ldquo;We will improve schools&rdquo; is not trackable; &ldquo;seven
          rooms in three months&rdquo; is. Each row records the wording used, so
          anybody can check the entry against the source without taking our word
          for it.
        </p>
        <p className="text-[0.92rem] leading-relaxed text-ink-2">
          Demands that were raised but never answered are kept too, marked{' '}
          <strong>unanswered</strong>. Silence is a result and it should be
          countable.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="display text-xl">How the clock works</h2>
        <p className="text-[0.92rem] leading-relaxed text-ink-2">
          The colour is a function of the window the official chose, not of how
          hard the job is. If they said 48 hours, the tile is measured against 48
          hours. Let <em>e</em> be the share of that window already spent:
        </p>
        <Card className="overflow-hidden">
          <table className="w-full text-left text-[0.85rem]">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Share of window spent</th>
                <th className="px-4 py-2.5 font-semibold">Band</th>
                <th className="px-4 py-2.5 font-semibold">What it means</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                [`e < ${RAMP.fresh}`, 'fresh'],
                [`${RAMP.fresh} ≤ e < ${RAMP.soon}`, 'soon'],
                [`${RAMP.soon} ≤ e < ${RAMP.urgent}`, 'urgent'],
                [`e ≥ ${RAMP.urgent}`, 'critical'],
                ['past the deadline', 'broken'],
              ].map(([rule, band]) => {
                const s = BAND_STYLE[band as UrgencyBand];
                return (
                  <tr key={band}>
                    <td className="tnum px-4 py-2.5 font-mono text-[0.8rem]">{rule}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span
                          className="size-2.5 rounded-[3px]"
                          style={{ background: s.fill }}
                          aria-hidden
                        />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">{s.meaning}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <p className="text-[0.92rem] leading-relaxed text-ink-2">
          A promise with no date can never turn red, which is precisely why undated
          promises get given. They are logged separately as{' '}
          <strong>no deadline</strong> so that the count of them is visible, and
          the first thing to ask about any of them is: by when?
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="display text-xl">What red actually claims</h2>
        <Card className="border-l-4 p-5" >
          <p className="text-[0.92rem] leading-relaxed text-ink-2">
            A red tile means: <strong>the deadline passed and no verified evidence
            of completion exists on this register.</strong> It is a statement about
            what can be shown, not an allegation that any individual did anything
            wrong. If the work was done, one photograph closes it, and that is the
            fastest way to turn a tile green.
          </p>
        </Card>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="display text-xl">What moves the progress bar</h2>
        <p className="text-[0.92rem] leading-relaxed text-ink-2">
          Only accepted evidence. An announcement that work is complete does not
          move it; a photograph of the completed work, checked by a volunteer
          against the site, does. Every submitter has to declare whether their
          evidence <em>supports</em> or <em>refutes</em> completion, and who they
          are relative to the place, so a reader can weigh it.
        </p>
        <p className="text-[0.92rem] leading-relaxed text-ink-2">
          When officials say a thing is done and residents&rsquo; evidence says it is
          not, the row becomes <strong>disputed</strong> rather than being decided
          quietly in either direction.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="display text-xl">Corrections</h2>
        <p className="text-[0.92rem] leading-relaxed text-ink-2">
          If a date, a name, or a claim here is wrong, file it as a complaint
          against the row. Corrections are made against the source, and the audit
          trail on each promise page shows every change.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="display text-xl">The full legend</h2>
        <div className="mt-3 rounded-xl border bg-surface px-4 py-4">
          <Legend />
        </div>
        <ul className="mt-4 space-y-2">
          {BANDS.map((b) => (
            <li key={b} className="flex gap-3 text-[0.85rem]">
              <span
                className={`mt-1 size-2.5 shrink-0 rounded-[3px] ${bandTexture(b)}`}
                style={{ background: BAND_STYLE[b].fill }}
                aria-hidden
              />
              <span>
                <strong className="font-semibold">{BAND_STYLE[b].label}</strong>
                <span className="text-ink-2">: {BAND_STYLE[b].meaning}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
