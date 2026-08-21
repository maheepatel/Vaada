import Link from 'next/link';
import type { Metadata } from 'next';
import { getRegister, buildCounts } from '@/lib/data';
import { toLive, BAND_STYLE } from '@/lib/status';
import { buildAuthorities, type AuthorityRecord } from '@/lib/authority';
import { formatCount, percent, roughDuration } from '@/lib/format';
import { Card, SectionHeading, StatTile, BandChip } from '@/components/ui';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Who is answerable',
  description:
    'Every official named on the register, with the promises they own and how many of them were kept.',
};

export default async function AuthorityIndexPage() {
  const now = Date.now();
  const { commitments, proofs, complaints, receipts } = await getRegister();
  const counts = buildCounts(proofs, complaints, receipts);
  const live = commitments.map((c) => toLive(c, now, counts(c.id)));
  const authorities = buildAuthorities(live);

  const withBroken = authorities.filter((a) => a.broken > 0);
  const contactable = authorities.filter((a) => a.contactable).length;
  const onTheClock = authorities
    .filter((a) => a.nextDeadlineMs !== null)
    .sort((a, b) => (a.nextDeadlineMs ?? 0) - (b.nextDeadlineMs ?? 0))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="eyebrow">Accountability index</p>
        <h1 className="h-page display mt-2">
          Whose desk it sits on
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
          A single missed deadline is an anecdote. The same name against nine of
          them, with a kept rate printed beside it, is a record. Nothing here is
          an editorial judgement. Every number is counted from the same rows the
          map is drawn from.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile label="Officials named" value={authorities.length} />
        <StatTile
          label="With a missed deadline"
          value={withBroken.length}
          accent={BAND_STYLE.broken.softOn}
        />
        <StatTile
          label="Reachable by email"
          value={`${contactable}/${authorities.length}`}
          hint="a breach notice can actually be sent"
        />
        <StatTile
          label="Currently on the clock"
          value={onTheClock.length > 0 ? authorities.filter((a) => a.nextDeadlineMs !== null).length : 0}
        />
      </div>

      {contactable < authorities.length && (
        <p
          className="mt-4 rounded-xl px-4 py-3 text-[0.82rem] leading-relaxed"
          style={{
            background: 'var(--band-urgent-soft)',
            color: 'var(--band-urgent-ink)',
          }}
        >
          <strong className="font-semibold">
            {authorities.length - contactable} of {authorities.length} officials have
            no verified contact address on file.
          </strong>{' '}
          Breach notices cannot be sent to them. Contact details are never
          guessed here. A wrong address on an accountability notice is worse than no
          address, so each one has to be added from a government source.
        </p>
      )}

      <section className="mt-12">
        <SectionHeading
          eyebrow="Ranked by missed deadlines, then by how much they carry"
          title="The register by name"
        />
        <ul className="space-y-2.5">
          {authorities.map((a) => (
            <AuthorityRow key={a.slug} record={a} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function AuthorityRow({ record: a }: { record: AuthorityRecord }) {
  const style = BAND_STYLE[a.worst];

  return (
    <li>
      <Card className="overflow-hidden">
        <Link
          href={`/authority/${a.slug}`}
          className="flex gap-3 p-4 transition-colors hover:bg-surface-2 sm:gap-4"
        >
          <span
            className="w-1 shrink-0 rounded-full"
            style={{ background: style.fill }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <h3 className="text-[1rem] font-semibold leading-snug">
                {a.official.name}
              </h3>
              <BandChip band={a.worst} size="sm" />
            </div>

            <p className="mt-0.5 text-[0.8rem] text-ink-3">
              {a.roles.join(' · ')}
              {a.official.body ? ` · ${a.official.body}` : ''}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.75rem]">
              <span className="font-semibold">
                {a.commitments.length} promise{a.commitments.length === 1 ? '' : 's'}
              </span>
              <span style={{ color: BAND_STYLE.kept.softOn }}>{a.kept} kept</span>
              <span style={{ color: BAND_STYLE.broken.softOn }}>{a.broken} missed</span>
              {a.undated + a.unanswered > 0 && (
                <span style={{ color: BAND_STYLE.undated.softOn }}>
                  {a.undated + a.unanswered} undated
                </span>
              )}
              <span className="text-ink-3">
                kept rate {a.keptRate === null ? 'n/a' : percent(a.keptRate)}
              </span>
              {a.reach > 0 && (
                <span className="text-ink-3">{formatCount(a.reach)} affected</span>
              )}
              {a.nextDeadlineMs !== null && (
                <span className="ml-auto font-medium text-ink-2">
                  next due in {roughDuration(a.nextDeadlineMs)}
                </span>
              )}
            </div>
          </div>
        </Link>
      </Card>
    </li>
  );
}
