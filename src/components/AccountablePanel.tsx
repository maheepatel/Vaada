import Link from 'next/link';
import { Card } from './ui';
import { officialSlug } from '@/lib/authority';
import { BAND_STYLE } from '@/lib/status';
import type { LiveCommitment, Official } from '@/lib/types';

/**
 * Who is answerable — the loudest block on the page after the clock.
 *
 * Named individuals with their role, their body, their handle, and whether a
 * breach notice can actually reach them. The "no contact on file" state is
 * shown rather than hidden, because a promise nobody can be written to about is
 * a gap in the register, and gaps only get filled if they are visible.
 */
export function AccountablePanel({
  commitment: c,
  emphasis = false,
}: {
  commitment: LiveCommitment;
  emphasis?: boolean;
}) {
  const breached = c.band === 'broken';
  const heading = breached
    ? 'Owes an answer for this'
    : 'Who has to answer for this';

  if (c.accountable.length === 0) {
    return (
      <Card className="border-dashed p-4">
        <p className="eyebrow">Nobody named</p>
        <p className="mt-1.5 text-[0.83rem] leading-relaxed text-ink-2">
          No official has been recorded as answerable for this promise. An
          unowned promise cannot be chased. If you know whose desk this sits on,
          add them.
        </p>
      </Card>
    );
  }

  return (
    <Card
      // A breached promise gets a heavier frame so the answerable name is what
      // your eye lands on, not a grey sidebar item.
      className={`overflow-hidden ${emphasis && breached ? 'border-2' : ''}`}
    >
      <div
        className="border-b px-4 py-2.5"
        style={
          breached
            ? { background: BAND_STYLE.broken.soft, color: BAND_STYLE.broken.softOn }
            : { background: 'var(--surface-2)' }
        }
      >
        <p className="eyebrow" style={breached ? { color: 'inherit' } : undefined}>
          {heading}
        </p>
      </div>

      <ul className="divide-y">
        {c.accountable.map((o) => (
          <OfficialRow key={o.name} official={o} breached={breached} />
        ))}
      </ul>

      {breached && (
        <div className="border-t bg-surface-2 px-4 py-3">
          <p className="text-[0.78rem] leading-relaxed text-ink-2">
            The deadline has passed. Ask the office above, in writing, for a
            status and a revised date — and put whatever they say back on this
            entry so the next person does not have to ask again.
          </p>
        </div>
      )}
    </Card>
  );
}

function OfficialRow({ official: o, breached }: { official: Official; breached: boolean }) {
  return (
    <li className="px-4 py-3">
      <Link
        href={`/authority/${officialSlug(o)}`}
        className="text-[0.95rem] font-semibold leading-tight hover:underline"
      >
        {o.name}
      </Link>
      <p className="mt-0.5 text-[0.78rem] text-ink-2">{o.role}</p>
      {o.body && <p className="text-[0.75rem] text-ink-3">{o.body}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {o.handle && (
          <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[0.73rem] font-medium text-[var(--brand-ink)]">
            {o.handle}
          </span>
        )}

        {o.email ? (
          <span
            className="rounded px-1.5 py-0.5 text-[0.72rem] font-semibold"
            style={{
              background: 'var(--band-kept-soft)',
              color: 'var(--band-kept-ink)',
            }}
            title={o.contactSource ? `Source: ${o.contactSource}` : undefined}
          >
            reachable by email
          </span>
        ) : (
          <span
            className="rounded px-1.5 py-0.5 text-[0.72rem] font-semibold"
            style={{
              background: breached
                ? 'var(--band-urgent-soft)'
                : 'var(--band-unanswered-soft)',
              color: breached
                ? 'var(--band-urgent-ink)'
                : 'var(--band-unanswered-ink)',
            }}
          >
            no contact on file
          </span>
        )}
      </div>

      {o.office && <p className="mt-1.5 text-[0.73rem] text-ink-3">{o.office}</p>}
    </li>
  );
}
