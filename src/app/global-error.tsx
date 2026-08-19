'use client';

/**
 * Last resort: an error thrown by the root layout itself.
 *
 * This replaces `<html>` entirely, so it cannot use the site header, the
 * fonts or the design tokens — none of them have mounted. It is deliberately
 * plain inline CSS, and it must stay that way, because anything it imports is
 * another thing that can fail at exactly the moment it is needed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf8f3',
          color: '#16150f',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Vaada could not load.</h1>
          <p style={{ marginTop: '0.75rem', lineHeight: 1.6, color: '#4d493d' }}>
            Something failed before the page could start. The register is
            unaffected.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                borderRadius: '999px',
                padding: '0.55rem 1rem',
                background: '#16150f',
                color: '#faf8f3',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/* A plain anchor, deliberately. This boundary catches a
                failure in the root layout itself, which means the router may
                be part of what broke; <Link> would try a client-side
                navigation through it. A full document load is the only
                reliable way out of here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                borderRadius: '999px',
                padding: '0.55rem 1rem',
                border: '1px solid #d3ccb9',
                color: '#4d493d',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Back to the map
            </a>
          </div>
          {error.digest && (
            <p style={{ marginTop: '2rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#a9a392' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
