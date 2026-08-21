import type { Metadata } from 'next';
import { getRegister, countBy } from '@/lib/data';
import { toLive, byUrgency } from '@/lib/status';
import { RegisterBrowser } from '@/components/RegisterBrowser';
import type { UrgencyBand } from '@/lib/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'The full register',
  description:
    'Every tracked commitment in one list, filterable by status, category and place.',
};

const VALID_BANDS = new Set<string>([
  'kept', 'fresh', 'soon', 'urgent', 'critical',
  'broken', 'disputed', 'undated', 'unanswered',
]);

export default async function RegisterPage({ searchParams }: PageProps<'/register'>) {
  const { band } = await searchParams;
  const now = Date.now();
  const { commitments, proofs, complaints } = await getRegister();

  const proofCounts = countBy(proofs, (p) => p.commitmentId);
  const complaintCounts = countBy(
    complaints.filter((c) => c.commitmentId),
    (c) => c.commitmentId as string,
  );

  const live = commitments
    .map((c) =>
      toLive(c, now, {
        proofs: proofCounts.get(c.id),
        complaints: complaintCounts.get(c.id),
      }),
    )
    .sort(byUrgency);

  const initialBand =
    typeof band === 'string' && VALID_BANDS.has(band)
      ? (band as UrgencyBand)
      : undefined;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="eyebrow">The register</p>
        <h1 className="h-page display mt-2">
          Every promise on the record
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
          One row per commitment. Filter by what state it is in, what it is about,
          or search for a place, a school or the official who owns it.
        </p>
      </header>

      <div className="mt-8">
        <RegisterBrowser commitments={live} initialBand={initialBand} />
      </div>
    </div>
  );
}
