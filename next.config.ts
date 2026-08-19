import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

/**
 * The Supabase origin, so the CSP can name it instead of opening
 * `connect-src` and `img-src` to the whole web. Falls back to allowing any
 * Supabase project when the variable is absent, which is the case during a
 * build with no environment — a wildcard under supabase.co is still far
 * tighter than `*`.
 */
const supabaseOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return 'https://*.supabase.co';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://*.supabase.co';
  }
})();

/**
 * Content Security Policy.
 *
 * The valuable directives here are the ones that constrain where this page can
 * *send* data and who can frame it. A register that publishes citizen-submitted
 * links and renders citizen-submitted images is a place people will try to get
 * a script into; `connect-src` means that even if one lands, it cannot post
 * what it steals anywhere except back to this origin or to Supabase.
 *
 * `script-src` keeps 'unsafe-inline' because Next.js injects inline bootstrap
 * and streaming payload scripts. Removing it needs per-request nonces from
 * middleware, which is worth doing later; shipping a CSP that silently breaks
 * hydration would be worse than shipping this one. 'unsafe-eval' is dev-only,
 * for React Fast Refresh.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Tailwind and the design tokens set style attributes directly.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: " + supabaseOrigin,
  "font-src 'self' data:",
  // Where the browser may talk to. Everything else is refused.
  `connect-src 'self' ${supabaseOrigin}${isDev ? ' ws: wss:' : ''}`,
  "media-src 'self' " + supabaseOrigin,
  // Nothing on this site should ever be framed, and it frames nothing.
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  // Stops an injected <base> from repointing every relative URL on the page.
  "base-uri 'self'",
  // Intake forms may only post back here, never to a third party.
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Belt and braces alongside frame-ancestors, for older browsers.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Never send the path of an internal page to another origin. /review carries
  // its token in the query string, so this one is load-bearing.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  // The floating dev badge sits over the bottom-left corner, which is where the
  // mosaic starts. It obscured a tile in every README screenshot, and it is
  // noise while working on the map too. Dev-only setting; no effect on a build.
  devIndicators: false,

  // Do not advertise the framework version to anyone scanning for it.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...securityHeaders,
          // HSTS only makes sense over TLS, and setting it in local dev would
          // pin localhost to https in the browser for a year.
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]),
        ],
      },
      {
        // The review queue is unreviewed material naming real people. Beyond
        // the noindex meta tag, tell every crawler and every cache to keep out.
        source: '/review',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
