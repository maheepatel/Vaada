import type { Metadata } from 'next';
import { SubmitForm } from '@/components/SubmitForm';

export const metadata: Metadata = {
  title: 'Log a promise',
  description:
    'Paste a post in which an official accepted a demand. The deadlines are pulled out automatically and turned into tracked commitments.',
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="eyebrow">Intake</p>
        <h1 className="h-page display mt-2">
          Turn a post into a clock
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
          Most promises are made once, in public, and then forgotten by everyone
          except the people waiting for them. Paste the post here and every
          commitment inside it becomes a tile with its own deadline. No re-typing,
          no spreadsheet.
        </p>
      </header>

      <div className="mt-8">
        <SubmitForm />
      </div>
    </div>
  );
}
