import Link from 'next/link';
import { NavLinks, NavStrip } from './NavLinks';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <Mark />
          <span className="flex items-baseline gap-1.5">
            <span className="display text-[1.35rem] leading-none tracking-tight">Vaada</span>
            <span className="hidden text-[0.65rem] font-medium uppercase tracking-[0.12em] text-ink-3 xl:inline">
              promise register
            </span>
          </span>
        </Link>

        <NavLinks />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/rankings"
            className="rounded-full border px-3 py-1.5 text-[0.78rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink sm:px-3.5"
          >
            <span className="hidden sm:inline">State &amp; district rankings</span>
            <span className="sm:hidden">Rankings</span>
          </Link>
          <Link
            href="/submit"
            className="rounded-full bg-ink px-3 py-1.5 text-[0.78rem] font-semibold text-paper transition-opacity hover:opacity-85 sm:px-3.5"
          >
            <span className="hidden sm:inline">Log a promise</span>
            <span className="sm:hidden">Log</span>
          </Link>
        </div>
      </div>

      <NavStrip />
    </header>
  );
}

/**
 * A four-square mark: three filled along the urgency ramp, one hollow. It is
 * the mosaic itself, shrunk to 20px.
 */
function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <rect x="0" y="0" width="9" height="9" rx="1.5" fill="var(--band-fresh)" />
      <rect x="11" y="0" width="9" height="9" rx="1.5" fill="var(--band-soon)" />
      <rect x="0" y="11" width="9" height="9" rx="1.5" fill="var(--band-broken)" />
      <rect
        x="11.75"
        y="11.75"
        width="7.5"
        height="7.5"
        rx="1"
        fill="none"
        stroke="var(--ink-4)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
