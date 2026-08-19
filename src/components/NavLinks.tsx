'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '/', label: 'Map', hint: 'Every promise, by state' },
  { href: '/rankings', label: 'Rankings', hint: 'Who is keeping their word' },
  { href: '/register', label: 'Register', hint: 'The full filterable list' },
  { href: '/deadlines', label: 'Deadlines', hint: 'Clocks running down now' },
  { href: '/authority', label: 'Who answers', hint: 'Officials and their record' },
  { href: '/complaints', label: 'Complaints', hint: 'Filed against entries' },
  { href: '/my', label: 'My logs', hint: 'What you have submitted' },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/**
 * Primary navigation, wide screens.
 *
 * The active item gets a filled pill rather than a colour change, because the
 * surface palette is deliberately low-chroma and a tinted label does not read
 * as "you are here" against it.
 */
export function NavLinks() {
  const isActive = useIsActive();

  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
      {LINKS.map((l) => {
        const active = isActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 text-[0.82rem] font-medium whitespace-nowrap transition-colors ${
              active
                ? 'bg-ink text-paper'
                : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Primary navigation, narrow screens.
 *
 * This replaced a horizontally scrolling strip pinned under the header. The
 * strip cost every phone reader a permanent second row of chrome, put a
 * sideways scroll axis inside a vertically scrolling page, and still hid half
 * its destinations off the right edge with nothing on screen to say so.
 *
 * A menu button costs one tap and shows all six destinations at once, with
 * room for a line of explanation under each — which the strip could never fit
 * and which matters for a reader who does not already know what "Register"
 * means here.
 */
export function NavMenu() {
  const isActive = useIsActive();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="nav-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="flex size-9 items-center justify-center rounded-full border text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          {open ? (
            <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
              <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
            </g>
          ) : (
            <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="2.5" y1="4.5" x2="13.5" y2="4.5" />
              <line x1="2.5" y1="8" x2="13.5" y2="8" />
              <line x1="2.5" y1="11.5" x2="13.5" y2="11.5" />
            </g>
          )}
        </svg>
      </button>

      {open && (
        <>
          {/* Tapping anywhere off the panel closes it, which is the gesture
              people already expect from every app menu. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-14 z-30 cursor-default bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]"
          />
          <div
            id="nav-menu"
            className="absolute inset-x-0 top-full z-40 border-b bg-paper shadow-[var(--shadow-lg)]"
          >
            <nav className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6" aria-label="Primary">
              <ul>
                {LINKS.map((l) => {
                  const active = isActive(l.href);
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                          active ? 'bg-surface-2' : 'hover:bg-surface-2'
                        }`}
                      >
                        <span className="min-w-0">
                          <span
                            className={`block text-[0.95rem] leading-tight ${
                              active ? 'font-semibold text-ink' : 'font-medium text-ink'
                            }`}
                          >
                            {l.label}
                          </span>
                          <span className="mt-0.5 block text-[0.75rem] leading-tight text-ink-3">
                            {l.hint}
                          </span>
                        </span>
                        {active && (
                          <span className="shrink-0 text-[0.7rem] font-semibold text-ink-3">
                            here
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
