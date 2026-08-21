import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/**
 * robots.txt.
 *
 * The register is meant to be crawled, quoted and cited — that is the entire
 * point of publishing it. What must never be crawled is anything unreviewed or
 * private: `/review` holds machine output naming real officials that no human
 * has checked, and `/my` is one person's own submissions.
 *
 * AI crawlers are allowed deliberately. An accountability register that blocks
 * the systems people increasingly ask questions through has made itself
 * unfindable in the place the questions are now asked.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/review', '/my', '/api/'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
