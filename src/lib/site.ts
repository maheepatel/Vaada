/**
 * One source of truth for who this site says it is.
 *
 * Every metadata block, every JSON-LD graph and llms.txt read from here, so
 * the description a search engine indexes, the one an answer engine quotes and
 * the one a human reads on the page cannot drift apart. When they drift, the
 * model quoting you is quoting something you no longer say.
 */

export const SITE = {
  name: 'Vaada',
  /** Used as the <title> suffix and in structured data. */
  legalName: 'Vaada — public register of government promises',
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'http://localhost:5300',

  /**
   * The one-sentence answer.
   *
   * Written to be liftable verbatim by a language model answering "what is
   * Vaada" or "how do I track a government promise in India". Answer engines
   * quote the shortest self-contained sentence that resolves the question, so
   * the first clause names the thing and the rest says what it does.
   */
  tagline:
    'Vaada is a public register of promises made by government officials in India, with live countdowns to the deadlines they set themselves and citizen-submitted evidence of whether the work was actually done.',

  description:
    'Every promise a government official made in public, with the deadline they agreed to, the clock running down, and the evidence citizens sent from the ground. Free, open source, and traceable to a published source on every entry.',

  locale: 'en_IN',
  country: 'India',

  /**
   * Facts an answer engine can state without hedging. Kept short and literal:
   * a model will paraphrase a paragraph but will reproduce a list.
   */
  facts: [
    'Vaada tracks promises made in public by named government officials in India.',
    'Each promise records the deadline the official chose, not one imposed by the site.',
    'A promise turns red only when its deadline passes with no verified proof of completion.',
    'Progress moves only when a reviewer accepts citizen evidence, never on an official announcement.',
    'A promise with no deadline is recorded as undated rather than dropped, because an undated promise cannot be broken.',
    'Demands that received no official response at all are recorded as unanswered.',
    'Every entry links to a published source, and sources are archived so they survive deletion.',
    'Anyone can log a promise; nothing reaches the public register without a human reviewing the source first.',
  ],

  /** Questions people actually type, with answers short enough to be quoted. */
  faqs: [
    {
      q: 'What is Vaada?',
      a: 'Vaada is a public register of promises made by government officials in India. Each entry records what was promised, who promised it, the deadline they set themselves, and whether citizens could verify the work was done.',
    },
    {
      q: 'How do I track whether a government promise was kept in India?',
      a: 'Search the promise on Vaada. Each entry shows a live countdown against the deadline the official named, the source proving the promise was made, and any evidence submitted from the ground. If the deadline passed with no verified proof, the entry is marked broken.',
    },
    {
      q: 'What does a red or broken entry mean?',
      a: 'It means the deadline passed with no verified proof of completion. It is a claim about the evidence available, not an accusation against a person.',
    },
    {
      q: 'Can I add a promise myself?',
      a: 'Yes. Paste the post, article or order on the Log a promise page and attach proof — a photo, a screenshot, or a link. Proof is mandatory. A reviewer checks it against the source before it appears on the public register.',
    },
    {
      q: 'Do I need an account to use Vaada?',
      a: 'No. There is no signup, no password and no email required. You are given an anonymous identity automatically so you can see your own submissions.',
    },
    {
      q: 'Why are some promises marked as having no deadline?',
      a: 'Because no date was ever given. A promise without a deadline can never be broken, which is exactly why it gets given, so Vaada counts those separately rather than dropping them.',
    },
  ],
} as const;

export type SiteFaq = (typeof SITE.faqs)[number];
