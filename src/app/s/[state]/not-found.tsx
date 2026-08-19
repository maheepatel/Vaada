import { NotFoundPanel } from '@/components/NotFoundPanel';

/** Covers an unknown state slug, and the district route nested beneath it. */
export default function StateNotFound() {
  return (
    <NotFoundPanel
      title="No such place on the register."
      blurb="This state or district is not one the register covers yet, or the address is misspelt. The register grows by submission — if a promise was made here, it can be logged."
    />
  );
}
