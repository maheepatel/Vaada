import Link from 'next/link';
import type { ReactNode } from 'react';
import { BAND_STYLE, bandTexture } from '@/lib/status';
import type { UrgencyBand } from '@/lib/types';

export function BandChip({
  band,
  children,
  size = 'md',
}: {
  band: UrgencyBand;
  children?: ReactNode;
  size?: 'sm' | 'md';
}) {
  const s = BAND_STYLE[band];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${
        size === 'sm' ? 'px-2 py-0.5 text-[0.65rem]' : 'px-2.5 py-1 text-[0.72rem]'
      }`}
      style={{ background: s.soft, color: s.softOn }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: s.fill }}
        aria-hidden
      />
      {children ?? s.label}
    </span>
  );
}

export function Card({
  children,
  className = '',
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <As
      className={`rounded-xl border bg-surface shadow-[var(--shadow-sm)] ${className}`}
    >
      {children}
    </As>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-surface p-3.5 sm:p-4">
      <p className="eyebrow">{label}</p>
      <p
        className="display tnum mt-1.5 text-[1.9rem] leading-none sm:text-[2.2rem]"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs leading-snug text-ink-3">{hint}</p>}
    </div>
  );
}

/**
 * Verified progress only. This bar never moves because an official said so —
 * it moves when a proof is accepted, which is the whole point of the product.
 */
export function ProgressBar({
  value,
  band = 'fresh',
  showLabel = true,
}: {
  value: number;
  band?: UrgencyBand;
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const s = BAND_STYLE[band];
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Verified progress"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: s.fill }}
        />
      </div>
      {showLabel && (
        <span className="tnum w-9 shrink-0 text-right text-[0.7rem] font-semibold text-ink-3">
          {pct}%
        </span>
      )}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  action?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="h-section display">{title}</h2>
        {children && (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{children}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 rounded-full border px-3 py-1.5 text-[0.78rem] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}

/**
 * The colour key.
 *
 * `compact` is used above the fold on the home page, where the legend competes
 * for vertical space with the map it explains — tighter gaps and smaller swatches
 * keep it to a single line on a laptop and two on a phone.
 */
export function Legend({ compact = false }: { compact?: boolean }) {
  const order: UrgencyBand[] = [
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
  return (
    <ul className={`flex flex-wrap ${compact ? 'gap-x-3.5 gap-y-1.5' : 'gap-x-4 gap-y-2'}`}>
      {order.map((b) => {
        const s = BAND_STYLE[b];
        return (
          <li key={b} className="flex items-center gap-1.5" title={s.meaning}>
            <span
              className={`shrink-0 rounded-[2px] ${compact ? 'size-2' : 'size-2.5'} ${bandTexture(b)}`}
              style={{ background: s.fill }}
              aria-hidden
            />
            <span
              className={`font-medium text-ink-2 ${compact ? 'text-[0.68rem]' : 'text-[0.72rem]'}`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-surface-2 px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
