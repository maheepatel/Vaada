import { SITE } from './site';
import type { LiveCommitment } from './types';
import { BAND_STYLE } from './status';

/**
 * JSON-LD graphs.
 *
 * Two audiences, one vocabulary. Search engines use this for rich results;
 * answer engines use it as the structured backbone behind a prose answer, and
 * a model with a `Dataset` node in front of it will say "a register of 34
 * tracked promises" rather than guessing at what the page is.
 *
 * `Dataset` is the honest type for the register as a whole. It is deliberately
 * NOT `ClaimReview`, which belongs to accredited fact-checking organisations
 * making a rating about a claim's truth. Vaada rates evidence of completion,
 * not truth, and claiming the wrong schema on entries that name real officials
 * would be both a structured-data violation and a misrepresentation.
 */

export function organisationLd() {
  return {
    '@type': 'Organization',
    '@id': `${SITE.url}/#organisation`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    description: SITE.tagline,
    areaServed: { '@type': 'Country', name: SITE.country },
  };
}

export function websiteLd() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.tagline,
    inLanguage: 'en-IN',
    publisher: { '@id': `${SITE.url}/#organisation` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/register?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * The register as a dataset. This is what puts it in Google Dataset Search and
 * what tells a model the page is a structured record rather than an article.
 */
export function datasetLd(counts: { total: number; kept: number; broken: number }) {
  return {
    '@type': 'Dataset',
    '@id': `${SITE.url}/#dataset`,
    name: 'Vaada register of Indian government promises',
    description: `${SITE.tagline} Currently ${counts.total} promises tracked, of which ${counts.kept} are verified kept and ${counts.broken} passed their deadline with no verified proof of completion.`,
    url: SITE.url,
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    creator: { '@id': `${SITE.url}/#organisation` },
    spatialCoverage: { '@type': 'Place', name: SITE.country },
    keywords: [
      'government accountability',
      'India',
      'public promises',
      'election promises',
      'school infrastructure',
      'civic technology',
      'deadline tracking',
    ],
  };
}

export function faqLd() {
  return {
    '@type': 'FAQPage',
    '@id': `${SITE.url}/#faq`,
    mainEntity: SITE.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/**
 * One promise.
 *
 * The status is expressed in the register's own careful wording, because this
 * string is precisely what an answer engine will read back to somebody asking
 * whether an official kept their word.
 */
export function promiseLd(c: LiveCommitment) {
  const band = BAND_STYLE[c.band];
  const url = `${SITE.url}/p/${c.slug}`;

  return {
    '@type': 'WebPage',
    '@id': url,
    url,
    name: c.title,
    description: `${c.title} — promised in ${c.locality}${c.district ? `, ${c.district}` : ''}, ${c.state}. Status: ${band.label}. ${band.meaning}`,
    inLanguage: 'en-IN',
    isPartOf: { '@id': `${SITE.url}/#website` },
    about: {
      '@type': 'Thing',
      name: c.title,
      description: c.detail || c.title,
    },
    contentLocation: {
      '@type': 'Place',
      name: [c.locality, c.district, c.state].filter(Boolean).join(', '),
      address: {
        '@type': 'PostalAddress',
        addressLocality: c.locality || undefined,
        addressRegion: c.state,
        addressCountry: 'IN',
        postalCode: c.pincode || undefined,
      },
    },
    dateCreated: c.promisedOn,
    dateModified: c.updatedAt,
    ...(c.deadline ? { expires: c.deadline } : {}),
    citation: c.sources.map((s) => ({
      '@type': 'CreativeWork',
      name: s.publisher,
      url: s.url,
      datePublished: s.date,
    })),
    mentions: c.accountable.map((o) => ({
      '@type': 'Person',
      name: o.name,
      jobTitle: o.role,
      ...(o.body ? { worksFor: { '@type': 'Organization', name: o.body } } : {}),
    })),
  };
}

/** Wraps any set of nodes into one graph, which is cheaper than many scripts. */
export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
