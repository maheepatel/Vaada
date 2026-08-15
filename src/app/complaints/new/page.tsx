import type { Metadata } from 'next';
import { getRegister } from '@/lib/data';
import { ComplaintForm, type CommitmentOption } from '@/components/ComplaintForm';

export const metadata: Metadata = {
  title: 'File a complaint',
  description:
    'Report a promise that is not matching what you can see on the ground, or raise something nobody has promised anything about yet.',
};

export default async function NewComplaintPage({
  searchParams,
}: PageProps<'/complaints/new'>) {
  const { commitment } = await searchParams;
  const { commitments } = await getRegister();

  const options: CommitmentOption[] = commitments.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    place: `${c.locality}${c.district ? `, ${c.district}` : ''}`,
    stateSlug: c.stateSlug,
    districtSlug: c.districtSlug,
  }));

  return (
    <div className="mx-auto max-w-[820px] px-4 py-10 sm:px-6">
      <header>
        <p className="eyebrow">Complaint</p>
        <h1 className="h-page display mt-2">
          Say what you can actually see
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
          The gap between what was announced and what exists is the only thing this
          register is for. If they are not the same, write it down here.
        </p>
      </header>

      <div className="mt-8">
        <ComplaintForm
          options={options}
          preselect={typeof commitment === 'string' ? commitment : undefined}
        />
      </div>
    </div>
  );
}
