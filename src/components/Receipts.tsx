import { Card } from './ui';
import { formatDate } from '@/lib/format';
import type { Receipt, ReceiptKind } from '@/lib/types';

const KIND_LABEL: Record<ReceiptKind, string> = {
  social_post: 'Social media post',
  written_order: 'Written order',
  minutes: 'Minutes / memorandum',
  video: 'Video',
  press_report: 'Press report',
};

/**
 * How much weight a document carries, stated plainly rather than implied by
 * styling. A signed order on letterhead settles an argument; a link to a post
 * that may be deleted tomorrow does not.
 */
const KIND_WEIGHT: Record<ReceiptKind, string> = {
  written_order: 'Strongest: an order carrying a signature or seal',
  minutes: 'Strong: a record made at the time by the parties present',
  video: 'Strong: the commitment on camera',
  social_post: 'Moderate: a public statement, deletable',
  press_report: 'Moderate: independent, but second hand',
};

/**
 * The receipts panel: evidence that the promise *was made*, as distinct from
 * evidence it was kept.
 *
 * This is the half officials contest first — "I never said three months" — so
 * it is given its own block rather than being buried in a sources list. The
 * panel is deliberately loud about the difference between an archived copy and
 * a bare link, because a link to a deleted post proves nothing at all.
 */
export function Receipts({ receipts }: { receipts: Receipt[] }) {
  const archived = receipts.filter((r) => r.mediaUrls.length > 0).length;
  const signed = receipts.filter((r) => r.signed).length;
  const linkOnly = receipts.filter((r) => r.mediaUrls.length === 0 && r.url).length;

  if (receipts.length === 0) {
    return (
      <Card className="border-dashed p-5">
        <p className="text-[0.9rem] font-semibold">
          Nothing on file proving this promise was made.
        </p>
        <p className="mt-1.5 text-[0.83rem] leading-relaxed text-ink-2">
          This entry rests only on its sources. A screenshot of the post, or a
          scan of the written order, would make it stand up if it is ever
          disputed.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-[0.72rem] font-medium">
        <Stat n={receipts.length} label="on file" />
        <Stat
          n={signed}
          label="signed or sealed"
          tone={signed > 0 ? 'var(--band-kept-ink)' : undefined}
        />
        <Stat
          n={archived}
          label="archived here"
          tone={archived === 0 ? 'var(--band-urgent-ink)' : undefined}
        />
      </div>

      {linkOnly > 0 && archived === 0 && (
        <p
          className="rounded-lg px-3 py-2 text-[0.78rem] leading-relaxed"
          style={{
            background: 'var(--band-urgent-soft)',
            color: 'var(--band-urgent-ink)',
          }}
        >
          <strong className="font-semibold">Every receipt here is a bare link.</strong>{' '}
          If those posts come down, this entry can no longer show what was
          promised. A screenshot takes ten seconds and makes the record permanent.
        </p>
      )}

      {receipts.map((r) => (
        <ReceiptCard key={r.id} receipt={r} />
      ))}
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <span
      className="rounded-full bg-surface-2 px-2.5 py-1"
      style={tone ? { color: tone } : undefined}
    >
      <span className="tnum font-bold">{n}</span> {label}
    </span>
  );
}

function ReceiptCard({ receipt: r }: { receipt: Receipt }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-4">
        <span
          className="w-1 shrink-0 rounded-full"
          style={{
            background: r.signed ? 'var(--band-kept)' : 'var(--band-undated)',
          }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-ink-2">
              {KIND_LABEL[r.kind]}
            </span>
            {r.signed && (
              <span
                className="rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide"
                style={{
                  background: 'var(--band-kept-soft)',
                  color: 'var(--band-kept-ink)',
                }}
              >
                signed
              </span>
            )}
            {r.verified ? (
              <span
                className="text-[0.7rem] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--band-kept-ink)' }}
              >
                verified
              </span>
            ) : (
              <span
                className="text-[0.7rem] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--band-soon-ink)' }}
              >
                unchecked
              </span>
            )}
            <span className="ml-auto text-[0.7rem] text-ink-3">
              {formatDate(r.documentDate)}
            </span>
          </div>

          <h4 className="mt-2 text-[0.92rem] font-semibold leading-snug">{r.title}</h4>

          {r.description && (
            <p className="mt-1 text-[0.83rem] leading-relaxed text-ink-2">
              {r.description}
            </p>
          )}

          {r.quote && (
            <blockquote
              className="mt-2.5 border-l-2 pl-3 text-[0.85rem] leading-relaxed text-ink"
              style={{ borderColor: 'var(--band-kept)' }}
            >
              “{r.quote}”
            </blockquote>
          )}

          {r.mediaUrls.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {r.mediaUrls.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u}
                    alt={r.title}
                    className="h-28 w-28 rounded-lg border object-cover transition-opacity hover:opacity-85"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-2.5 text-[0.75rem] text-ink-3">
              No archived copy held. This receipt is a link only.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-ink-3">
            {r.url && (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-semibold text-[var(--brand-ink)] hover:underline"
              >
                Open the original ↗
              </a>
            )}
            <span>{KIND_WEIGHT[r.kind]}</span>
            <span className="ml-auto">added by {r.addedBy}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
