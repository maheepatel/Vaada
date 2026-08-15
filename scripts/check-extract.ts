/**
 * A quick check on the duration parser.
 *
 *   npx tsx scripts/check-extract.ts
 *
 * Not a test suite — the project has none yet. It exists because every false
 * positive here costs a human reviewer real time, and the failures below are
 * all ones that actually appeared in live news copy: "a three-week-long
 * protest" read as a three-week deadline, and so on. Add a line whenever a new
 * one turns up in the review queue.
 */

import { parseDuration } from '../src/lib/extract';

const CASES: [text: string, expected: string | null][] = [
  // --- must NOT be read as deadlines ---
  ['a three-week-long protest by students', null],
  ['the 15-day-old agitation continues', null],
  ['for the last two months nothing happened', null],
  ['over the past 3 weeks the school stayed shut', null],
  ['since two years the toilets have been locked', null],

  // --- must be read as deadlines ---
  ['all classrooms will be repaired within one week', 'within one week'],
  ['the road will be ready in the next 48 hours', 'in the next 48 hours'],
  ['seven rooms will be prepared in the next three months', 'in the next three months'],
  ['teachers will be posted immediately', 'immediately'],

  // --- a real deadline sitting next to a descriptive one ---
  ['after three weeks of protest, repairs will be done within 10 days', 'within 10 days'],
];

let pass = 0;
for (const [text, expected] of CASES) {
  const got = parseDuration(text)?.label ?? null;
  const ok = got === expected;
  if (ok) pass += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${JSON.stringify(text.slice(0, 58))}`,
    `\n      got ${JSON.stringify(got)}  want ${JSON.stringify(expected)}`,
  );
}

console.log(`\n${pass}/${CASES.length} passed`);
process.exit(pass === CASES.length ? 0 : 1);
