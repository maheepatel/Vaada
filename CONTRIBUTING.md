# Contributing to Vaada

Code contributions are welcome, but the editorial rules matter more. This
register names real people and makes checkable claims about them. One badly
sourced row discredits every correct row beside it.

---

## What counts as a promise

A row is created when **a person with authority states in public that a specific
thing will be done in a specific place**.

Trackable:

> "All classrooms will be repaired within one week."
> "Seven rooms will be prepared in the next three months."
> "Three teachers will be deployed at once."

Not trackable, and not a row:

> "We will improve education in the state."
> "The government is committed to child welfare."
> "Steps are being taken."

The test is simple: could a resident stand in that place on a given date and say
whether it happened? If not, it does not go on the map.

## Sourcing

Every row needs a source that a stranger can open and check. Record the wording
**verbatim** in `deadlineLabel`, not a paraphrase. "Within one week" and "in a
week or so" are different commitments and the difference will be argued about
later.

Where possible add a **receipt**: an archived screenshot of the post, or a scan
of the written order. A bare link is one deletion away from proving nothing,
which is why the UI flags entries that only have links.

`deadline` and `deadlineLabel` are both set or both null. The database enforces
this. A date with no quoted wording cannot be defended.

## Naming individuals

Name the **office and the person who holds it**, because an unowned promise
cannot be chased. But:

- Never guess a contact address. An official with no verified `email` is skipped
  by the alert system and that is the correct outcome. If you add one, add
  `contactSource` alongside it.
- Never write that someone lied, failed, or is corrupt. The register says the
  deadline passed with no verified proof of completion, which is what the
  evidence supports.
- Where a promise was accepted jointly, list every name. It counts against each
  of them, so that nobody can point at the other.

## Evidence

Submitters must declare whether their evidence **supports** or **refutes**
completion, and their relationship to the place. Both are what make the counts
mean anything.

Reviewers: nothing moves a progress bar except accepted evidence. An
announcement that work is complete is not evidence. When officials say a thing
is done and residents' photographs say it is not, the row becomes `disputed`
rather than being quietly decided either way.

Do not publish a child's face, anyone's phone number, or a home address.

## Correcting an entry

File a complaint against the row in the app. Corrections are made against the
source, and the audit trail on each promise page shows every change. If you are
the official named and the work was done, one photograph closes it faster than
anything else.

---

## Code

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run build
npm run check:extract
```

### Rules that are load-bearing

**The status engine never calls `Date.now()`.** `now` is an argument
everywhere in `src/lib/status.ts`. Server components read the clock once per
request and pass it down; `Countdown` is seeded with the server's value so the
first client render matches. Break this and you get either hydration mismatches
or tiles whose colour depends on when a component happened to re-render.

**Nothing automated may write to `commitments`.** The ingestion pipeline writes
candidates to a review queue. Do not add an auto-publish path, however high the
confidence score looks.

**Row-level security has no UPDATE or DELETE policy anywhere.** The anon key can
read the public tables and insert into the three intake tables, pinned to their
pending states. Moderation runs through the service role. If a feature seems to
need a public update, it needs a different design.

**Receipts and proofs are different things.** A receipt shows the promise *was
made*; a proof shows whether it was *kept*. They get contested by different
people and must stay apart.

### Things that will bite you

- Google News RSS links are a JavaScript shell, not an article. Publisher feeds
  can yield dated drafts; Google News queries can only yield leads for a human.
  Do not try to decode their URL blobs.
- Article bodies are filtered on topic, not on promise language. "Officials
  assured repairs within 15 days" lives in paragraph six, never the headline.
- The geo dataset is a convenience, never a gate. Every level accepts free text,
  because a register that refuses to record a promise made in a village it has
  not heard of is useless exactly where it is needed most.

### Adding a false positive to the parser

When the review queue surfaces something the extractor got wrong, add the
sentence to `scripts/check-extract.ts` before fixing it. The existing cases are
all real ones from live news copy, such as "a three-week-long protest" being
read as a three-week deadline.

### Screenshots

`node scripts/screenshots.mjs` regenerates the README images against a running
dev server. Re-run it after visual changes so the README never shows a UI that
no longer exists.
