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
 * The headline figures as a wrapping grid.
 *
 * This used to be a single `min-w-max` row inside an `overflow-x-auto`, which
 * meant that on any screen narrower than the row it became a horizontally
 * scrolling strip nested inside the vertically scrolling page. Two scroll axes
 * meeting in a 40px band is unusable on a phone: the figures sat half-clipped
 * by the band's own padding and the only way to read the last of them was to
 * drag the strip sideways, which nothing on screen advertised.
 *
 * A grid cannot do that. It reflows to the space it is given, every cell is
 * fully visible at every width, and the page keeps exactly one scroll axis.
 */
function StatGrid({ items, size }: { items: KeyNumber[]; size: 'sm' | 'md' }) {
  return (
    <ul
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-line sm:grid-cols-3 ${
        items.length > 4 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'
      }`}
    >
      {items.map((item) => {
        const body = (
          <>
            <span
              className={`tnum block font-bold leading-none ${
                size === 'sm'
                  ? 'text-[1.05rem] sm:text-[1.15rem]'
                  : 'display text-[1.6rem] sm:text-[1.9rem]'
              }`}
              style={item.tone ? { color: item.tone } : undefined}
            >
              {item.value}
            </span>
            <span className="mt-1 block text-[0.72rem] leading-tight font-medium text-ink-2">
              {item.label}
            </span>
            {item.hint && (
              <span className="mt-0.5 hidden text-[0.65rem] leading-tight text-ink-3 lg:block">
                {item.hint}
              </span>
            )}
          </>
        );

        const pad = size === 'sm' ? 'px-3 py-2.5' : 'px-4 py-3.5';

        return (
          <li key={item.label} className="bg-surface">
            {item.href ? (
              <Link
                href={item.href}
                className={`block h-full transition-colors hover:bg-surface-2 ${pad}`}
              >
                {body}
              </Link>
            ) : (
              <div className={`h-full ${pad}`}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The larger form, for pages where the numbers are the point. */
export function KeyNumbers({ items }: { items: KeyNumber[] }) {
  return <StatGrid items={items} size="md" />;
}

/**
 * The compact form, used directly under a page title.
 *
 * It stays deliberately short so the thing below it — the map, the league
 * table, the feed — is still on screen without scrolling. It is now self
 * contained: it carries its own border and rounding, so call sites do not wrap
 * it in a `border-y` band. That band was what clipped the figures.
 */
export function StatRibbon({ items }: { items: KeyNumber[] }) {
  return <StatGrid items={items} size="sm" />;
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
          </strong>
          . Those are the ones where showing up still changes the outcome.
        </>
      ) : (
        <>Nothing is due in the next two days.</>
      )}
    </p>
  );
}
