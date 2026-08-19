'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Runtime error boundary.
 *
 * `error.digest` is the only identifier shown. Next.js replaces real error
 * messages with a digest in production precisely so that a stack trace naming
 * internal paths, table names or query shapes never reaches a visitor, and
 * this must not undo that by rendering `error.message`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reported to the server console only. Nothing about the failure is
    // rendered into the page beyond the digest.
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col px-4 py-20 sm:px-6">
      <p className="eyebrow">Error</p>
      <h1 className="h-page display mt-3">Something went wrong here.</h1>
      <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-ink-2">
        This page failed to load. The register itself is unaffected — nothing
        has been changed or lost. Trying again usually works.
      </p>

      <div className="mt-7 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper transition-opacity hover:opacity-85"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border px-4 py-2 text-[0.85rem] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          Back to the map
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-[0.72rem] text-ink-4">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
