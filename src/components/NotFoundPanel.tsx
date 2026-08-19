import Link from 'next/link';

const ELSEWHERE = [
  { href: '/', label: 'The map', hint: 'Every promise, by state' },
  { href: '/register', label: 'The register', hint: 'The full filterable list' },
  { href: '/deadlines', label: 'Deadlines', hint: 'Clocks running down now' },
  { href: '/submit', label: 'Log a promise', hint: 'Paste a post, add proof' },
];

/**
 * The 404 body, shared by every not-found boundary.
 *
 * It lives in a component because `notFound()` thrown inside a dynamic segment
 * that has `generateStaticParams` does not reach the root boundary — Next
 * serves its own bare shell instead. Each such segment therefore needs its own
 * `not-found.tsx`, and this is what they all render so the four of them cannot
 * drift apart.
 */
export function NotFoundPanel({
  title = 'This page does not exist.',
  blurb = 'The address is wrong, or the link that brought you here was. Nothing on this register is ever deleted, so if you followed a link to a specific promise it has moved rather than gone — try finding it from the register.',
}: {
  title?: string;
  blurb?: string;
}) {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col px-4 py-20 sm:px-6">
      <p className="eyebrow">404</p>
      <h1 className="h-page display mt-3">{title}</h1>
      <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-ink-2">{blurb}</p>

      <div className="mt-7 flex flex-wrap gap-2.5">
        <Link
          href="/"
          className="rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper transition-opacity hover:opacity-85"
        >
          Back to the map
        </Link>
        <Link
          href="/register"
          className="rounded-full border px-4 py-2 text-[0.85rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          Search the register
        </Link>
      </div>

      <ul className="mt-10 grid gap-px overflow-hidden rounded-xl border bg-line sm:grid-cols-2">
        {ELSEWHERE.map((l) => (
          <li key={l.href} className="bg-surface">
            <Link
              href={l.href}
              className="block h-full px-4 py-3 transition-colors hover:bg-surface-2"
            >
              <span className="block text-[0.9rem] font-semibold text-ink">{l.label}</span>
              <span className="mt-0.5 block text-[0.75rem] text-ink-3">{l.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
