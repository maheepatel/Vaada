import Link from 'next/link';
import { BandChip, ProgressBar } from './ui';
import { Countdown, DeadlineTag } from './Countdown';
import { BAND_STYLE, CATEGORY_LABEL, bandTexture } from '@/lib/status';
import { formatDate, formatCount } from '@/lib/format';
import type { LiveCommitment } from '@/lib/types';

/**
 * One line of the register. Dense on purpose — a reader scanning fifty of
 * these should be able to answer "what is about to break?" without clicking.
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
    <li className="group relative">
      <Link
        href={`/p/${c.slug}`}
        className="flex gap-3 rounded-xl border bg-surface p-3.5 transition-colors hover:border-line-strong sm:gap-4 sm:p-4"
      >
        {/* The colour spine. Carries the band without needing a chip in the
            reader's first fixation. */}
        <span
          className={`w-1 shrink-0 rounded-full ${bandTexture(c.band)}`}
          style={{ background: style.fill }}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <h3 className="text-[0.95rem] font-semibold leading-snug text-ink">
              {c.title}
            </h3>
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
          </div>

          {showPlace && (
            <p className="mt-1 text-[0.8rem] text-ink-3">
              {c.locality}
              {c.district ? ` · ${c.district}` : ''} · {c.state}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <BandChip band={c.band} size="sm" />
            <span className="text-[0.72rem] text-ink-3">
              {CATEGORY_LABEL[c.category]}
            </span>
            {c.deadlineLabel && (
              <span className="text-[0.72rem] text-ink-3">
                said &ldquo;{c.deadlineLabel}&rdquo;
              </span>
            )}
            {c.deadline && (
              <span className="text-[0.72rem] text-ink-3">
                due {formatDate(c.deadline)}
              </span>
            )}
            {c.beneficiaries !== null && (
              <span className="text-[0.72rem] text-ink-3">
                {formatCount(c.beneficiaries)} affected
              </span>
            )}
          </div>

          {c.progress > 0 && (
            <div className="mt-2.5 max-w-xs">
              <ProgressBar value={c.progress} band={c.band} />
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
