import type { MetadataRoute } from 'next';
import { getRegister } from '@/lib/data';
import { rollUp } from '@/lib/status';
import { officialSlug } from '@/lib/authority';
import { SITE } from '@/lib/site';

/**
 * The sitemap, generated from the register itself rather than hand-listed.
 *
 * A promise page that exists but is not in here is a page search engines find
 * late or not at all, and the whole value of an accountability record is that
 * somebody looking for it can find it. Deriving it from the data means a new
 * accepted promise is listed the moment it is published.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { commitments } = await getRegister();
  const now = new Date();

  const fixed = [
    { path: '', priority: 1, freq: 'hourly' as const },
    { path: '/register', priority: 0.9, freq: 'hourly' as const },
    { path: '/deadlines', priority: 0.9, freq: 'hourly' as const },
    { path: '/rankings', priority: 0.8, freq: 'daily' as const },
    { path: '/authority', priority: 0.8, freq: 'daily' as const },
    { path: '/complaints', priority: 0.6, freq: 'daily' as const },
    { path: '/submit', priority: 0.7, freq: 'monthly' as const },
    { path: '/method', priority: 0.7, freq: 'monthly' as const },
  ].map((r) => ({
    url: `${SITE.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  // One entry per promise. These are the pages people link to and cite.
  const promises = commitments.map((c) => ({
    url: `${SITE.url}/p/${c.slug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  const states = rollUp(commitments, Date.now());
  const places = states.flatMap((s) => [
    {
      url: `${SITE.url}/s/${s.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    ...s.districts.map((d) => ({
      url: `${SITE.url}/s/${s.slug}/${d.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ]);

  const officials = [
    ...new Set(commitments.flatMap((c) => c.accountable.map((o) => officialSlug(o)))),
  ].map((slug) => ({
    url: `${SITE.url}/authority/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...fixed, ...promises, ...places, ...officials];
}
