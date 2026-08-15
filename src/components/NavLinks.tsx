'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '/', label: 'Map' },
  { href: '/scoreboard', label: 'Rankings' },
  { href: '/register', label: 'Register' },
  { href: '/deadlines', label: 'Deadlines' },
  { href: '/authority', label: 'Who answers' },
  { href: '/complaints', label: 'Complaints' },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/**
 * Primary navigation.
 *
 * Wide screens get the full row. Narrow screens used to get nothing at all,
 * which left phone users with no way to reach anything but the map. They now
 * get a scrollable strip of the same links, so every route stays one tap away
 * without a hamburger to open.
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
            className={`rounded-full px-2.5 py-1.5 text-[0.8rem] font-medium whitespace-nowrap transition-colors ${
              active
                ? 'bg-surface-3 text-ink'
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
 * The narrow-screen strip, rendered under the header bar.
 *
 * A horizontally scrollable row rather than a collapsed menu: with six
 * destinations, a tap to open and a tap to choose is one tap too many, and a
 * visible strip also tells a first-time reader what the site contains.
 */
export function NavStrip() {
  const isActive = useIsActive();
  const [scrolled, setScrolled] = useState(false);

  // Fades the strip's edge only once there is something scrolled out of view.
  useEffect(() => {
    const el = document.getElementById('nav-strip');
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollLeft > 4);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="border-t lg:hidden">
      <div
        id="nav-strip"
        className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 py-2 sm:px-6"
        style={{
          scrollbarWidth: 'none',
          maskImage: scrolled
            ? 'linear-gradient(to right, transparent, black 1.5rem)'
            : undefined,
        }}
      >
        {LINKS.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[0.78rem] font-medium whitespace-nowrap transition-colors ${
                active ? 'bg-ink text-paper' : 'bg-surface-2 text-ink-2'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
