import Link from 'next/link';
import { PromiseBar } from './ui';
import { Countdown, DeadlineTag } from './Countdown';
import { BAND_STYLE, CATEGORY_LABEL } from '@/lib/status';
import { formatDate, formatCount } from '@/lib/format';
import type { LiveCommitment } from '@/lib/types';

/**
 * One line of the register.
 *
 * Four zones, in the same order on every card, because a reader scanning fifty
 * of these is pattern-matching rather than reading:
 *
 *   1. what was promised          + how long is left
 *   2. where
 *   3. THE BAR                    + how much is verified done
 *   4. one muted line of detail
 *
 * The previous version put the band chip, the category, the quoted wording, the
 * due date and the affected count on one wrapping row, so at narrow widths they
 * reflowed into an unpredictable block and no two cards looked alike. It also
 * drew a progress bar only when `progress > 0`, which meant most rows had no
 * bar while the clock — the thing the product is actually about — appeared only
 * as a small text chip. Both are fixed by giving every card the same skeleton
 * and making the bar the element with the most weight.
 */
export function CommitmentRow({
  c,
  showPlace = true,
  live = false,
}: {
  c: LiveCommitment;
  showPlace?: boolean;
  /** Render a real ticking clock instead of a static tag. Costs a timer. */
  live?: boolean;
}) {
  const style = BAND_STYLE[c.band];

  return (
    <li>
      <Link
        href={`/p/${c.slug}`}
        className="block rounded-xl border bg-surface p-4 transition-colors hover:border-line-strong"
      >
        {/* 1 — the promise, and the clock */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[0.95rem] leading-snug font-semibold text-ink">
            {c.title}
          </h3>
          <span className="shrink-0">
            {live && c.band !== 'kept' && c.deadline && c.msRemaining !== null ? (
              <Countdown
                deadline={c.deadline}
                initialMs={c.msRemaining}
                band={c.band}
                size="sm"
              />
            ) : (
              <DeadlineTag msRemaining={c.msRemaining} band={c.band} />
            )}
          </span>
        </div>

        {/* 2 — where */}
        {showPlace && (
          <p className="mt-1 text-[0.78rem] text-ink-3">
            {c.locality}
            {c.district ? ` · ${c.district}` : ''} · {c.state}
          </p>
        )}

        {/* 3 — the bar, always */}
        <div className="mt-3">
          <PromiseBar band={c.band} elapsed={c.elapsed} progress={c.progress} />
        </div>

        {/* 4 — the detail, one line, deliberately quiet */}
        <p className="mt-2.5 text-[0.73rem] leading-relaxed text-ink-3">
          <span className="font-semibold" style={{ color: style.softOn }}>
            {style.label}
          </span>
          {' · '}
          {CATEGORY_LABEL[c.category]}
          {c.deadline && <>{' · '}due {formatDate(c.deadline)}</>}
          {c.deadlineLabel && <>{' · '}&ldquo;{c.deadlineLabel}&rdquo;</>}
          {c.beneficiaries !== null && (
            <>{' · '}{formatCount(c.beneficiaries)} affected</>
          )}
        </p>
      </Link>
    </li>
  );
}
