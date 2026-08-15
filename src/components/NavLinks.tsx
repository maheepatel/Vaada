'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Map' },
  { href: '/register', label: 'Register' },
  { href: '/deadlines', label: 'Deadlines' },
  { href: '/authority', label: 'Who answers' },
  { href: '/complaints', label: 'Complaints' },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {LINKS.map((l) => {
        const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 text-[0.825rem] font-medium transition-colors ${
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
