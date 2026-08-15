import Link from 'next/link';
import { BAND_STYLE } from '@/lib/status';

export interface KeyNumber {
  value: number | string;
  label: string;
  /** Colour for the figure. Omit for the neutral total. */
  tone?: string;
  href?: string;
  /** Shown under the label at wider sizes only. */
  hint?: string;
}

/**
 * The headline figures, as one dense strip rather than a grid of cards.
 *
 * This replaced five stat cards for one reason: those cards pushed the map
 * itself below the fold, and the map is the product. A reader should be able to
 * see how many promises exist, how many were kept, and how many were missed
 * *and* the shape of the country without scrolling.
 *
 * Horizontally scrollable on narrow screens rather than wrapping, so the row
 * never reflows into a second line that pushes the map down again.
 */
export function KeyNumbers({ items }: { items: KeyNumber[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <dl className="flex min-w-max items-stretch gap-0 rounded-xl border bg-surface">
        {items.map((item, i) => {
          const body = (
            <>
              <dd
                className="display tnum text-[1.7rem] leading-none sm:text-[2.1rem]"
                style={item.tone ? { color: item.tone } : undefined}
              >
                {item.value}
              </dd>
              <dt className="mt-1 text-[0.7rem] font-medium leading-tight text-ink-2">
                {item.label}
              </dt>
              {item.hint && (
                <p className="mt-0.5 hidden text-[0.65rem] leading-tight text-ink-3 lg:block">
                  {item.hint}
                </p>
              )}
            </>
          );

          const cls = `flex min-w-[7.5rem] flex-col px-4 py-3 sm:min-w-0 sm:flex-1 sm:px-5 ${
            i > 0 ? 'border-l' : ''
          }`;

          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={`${cls} transition-colors hover:bg-surface-2`}
            >
              {body}
            </Link>
          ) : (
            <div key={item.label} className={cls}>
              {body}
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/**
 * The thinnest possible version of the headline figures — a single ~40px line.
 *
 * It exists because of a genuine conflict: the map has to sit directly under
 * the title, and the map is two rows tall, which puts any normal stat block
 * below the fold. This ribbon fits above the map without displacing it, so a
 * reader sees both the shape of the country and the raw counts at once.
 */
export function StatRibbon({ items }: { items: KeyNumber[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max items-center gap-x-4 gap-y-1 sm:flex-wrap sm:gap-x-5">
        {items.map((item) => {
          const body = (
            <>
              <span
                className="tnum text-[1.05rem] font-bold leading-none"
                style={item.tone ? { color: item.tone } : undefined}
              >
                {item.value}
              </span>
              <span className="text-[0.78rem] leading-none text-ink-2">{item.label}</span>
            </>
          );
          return (
            <li key={item.label} className="flex items-baseline gap-1.5">
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-baseline gap-1.5 rounded hover:underline"
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * A one-line plain-English reading of the register, sitting directly under the
 * numbers. The point of the site is that somebody grasps what is and is not
 * done in a couple of seconds, and a sentence does that faster than a chart.
 */
export function PlainReading({
  total,
  kept,
  broken,
  undated,
  dueSoon,
}: {
  total: number;
  kept: number;
  broken: number;
  undated: number;
  dueSoon: number;
}) {
  return (
    <p className="text-[0.88rem] leading-relaxed text-ink-2">
      Of <strong className="font-semibold text-ink">{total}</strong> promises on
      the record,{' '}
      <strong className="font-semibold" style={{ color: BAND_STYLE.kept.softOn }}>
        {kept} were kept and verified
      </strong>
      ,{' '}
      <strong className="font-semibold" style={{ color: BAND_STYLE.broken.softOn }}>
        {broken} ran out of time
      </strong>{' '}
      with nobody able to show the work was done, and{' '}
      <strong className="font-semibold" style={{ color: BAND_STYLE.undated.softOn }}>
        {undated} were never given a date at all
      </strong>
      .{' '}
      {dueSoon > 0 ? (
        <>
          <strong className="font-semibold" style={{ color: BAND_STYLE.urgent.softOn }}>
            {dueSoon} run out in the next two days
          </strong>{' '}
          — those are the ones where showing up still changes the outcome.
        </>
      ) : (
        <>Nothing is due in the next two days.</>
      )}
    </p>
  );
}
