# Vaada

A public register of promises made by government officials — what was agreed,
in front of whom, by when, and what citizens found when they went and looked.

Built after a wave of school protests across India in July–August 2026, where
students won commitments in public and then had no way to hold anyone to them
once the cameras left.

## The idea in one paragraph

Every row is one thing a named official said in public they would do, in one
place, by a date they chose themselves. The register renders as a mosaic: one
box per state, one tile per promise, sized by how many people it affects and
coloured by how much of the promised window has burned. Tiles start green and
slide through yellow and orange to red. A red tile means the deadline passed
with no verified proof of completion. Anybody can send evidence from the ground,
and only accepted evidence moves a progress bar.

## Running it

```bash
npm install
npm run dev      # http://localhost:5300
```

It runs with no configuration. Without Supabase credentials it reads the
founding register from `src/data/seed.ts` and validates submissions without
storing them, which is enough to develop against.

### With Supabase

1. Create a project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill it in.
4. `npm run db:seed` (needs `SUPABASE_SERVICE_ROLE_KEY`).

## Layout

```
src/lib/
  types.ts     the domain model. Read this first.
  status.ts    the status engine — pure, clock-in-explicitly, no DOM
  treemap.ts   squarified treemap, output in percentages
  extract.ts   post -> draft commitments (duration phrases, named officials)
  data.ts      read layer: Supabase if configured, seed file otherwise
src/data/seed.ts   the founding register, every row sourced
src/components/    Mosaic, Countdown, forms, UI primitives
src/app/           routes
supabase/schema.sql   tables, constraints, RLS
scripts/seed.ts       pushes the seed into a fresh project
```

## Routes

| Route | What it is |
| --- | --- |
| `/` | national mosaic, scorecard, what is closest to breaking |
| `/s/[state]` | district mosaics for one state |
| `/s/[state]/[district]` | every promise in a district, plus local complaints |
| `/p/[slug]` | one promise: live clock, receipts, evidence, audit trail, who answers |
| `/register` | the full list with filters |
| `/deadlines` | live countdowns bucketed by horizon |
| `/authority` | every official named, ranked by missed deadlines |
| `/authority/[slug]` | one official's record and kept rate |
| `/complaints` | complaints register |
| `/submit` | paste a post, get drafted commitments |
| `/review` | the moderation queue (token-gated, noindex) |
| `/method` | the full rule set behind the colours |

## The two automated jobs

Both are cron routes protected by `CRON_SECRET`. `vercel.json` schedules them.
Vercel Cron can only issue GET, so GET is the live run and `?preview=1` is the
safe read-only version — use that by hand.

**`/api/cron/ingest`** (01:30 daily) reads news feeds and queues anything that
reads like an official accepting a demand. It writes to `ingest_candidates`,
never to `commitments`. Publisher feeds carry real article URLs, so their bodies
are fetched and dated commitments parsed out. Google News queries are used for
reach, but their links are a JavaScript shell rather than an article, so those
only ever become leads for a human to open.

**`/api/cron/alerts`** (03:00 daily) finds promises whose deadline has passed
with no verified proof, and composes two notices: one to the official who is
answerable, one to whoever logged or is following it.

### Before you turn alerts on

This sends email to real people in your name. It is off by default and the sweep
runs indefinitely as a dry run, recording every notice it *would* have sent.

```bash
curl -s "$SITE/api/cron/alerts?preview=1" -H "Authorization: Bearer $CRON_SECRET"
```

Read several runs of that first. Then `ALERTS_ENABLED=true` starts mail to
watchers; `ALERTS_NOTIFY_AUTHORITIES=true` is a *separate* switch for notices to
officials, because those two risks are not the same size. No address is ever
guessed — an official without a verified `email` is skipped and the alert row
records why. A unique index enforces one notice per promise per kind per
audience, forever.

## Location data

`src/data/geo/states.ts` carries all 36 states and UTs with their districts.
Below district it is deliberately partial — India has roughly 7,000 blocks and
640,000 villages, and UDISE+ lists about 1.5 million schools, none of which
belongs in a bundle. The picker treats an unknown place as completely normal and
lets you type it, because a register that refuses to record a promise made in a
village it has not heard of is useless exactly where it is needed most.

The district list is a hand-maintained snapshot and should be verified against
the Local Government Directory before anyone relies on it for reporting;
boundaries change often. Supplying a UDISE code on a school promise is the single
most useful thing a submitter can do, because it makes the row joinable to
official enrolment and infrastructure data.

## Things worth knowing before changing anything

- **The status engine takes `now` as an argument.** Never call `Date.now()`
  inside it. Server components read the clock once per request and thread the
  value through; client countdowns are seeded with the server's value so the
  first client render matches and hydration stays quiet.
- **A red tile is a claim about evidence, not about a person.** The wording
  throughout says "the deadline passed with no verified proof". Keep it that way.
- **`deadline` and `deadlineLabel` are both null or both set.** The database
  enforces this. A date with no quoted wording cannot be defended later.
- **Nothing public can write to `commitments`.** RLS gives the anon key SELECT
  everywhere plus INSERT into `proofs`, `complaints` and `submissions` only, and
  the `WITH CHECK` clauses pin those inserts to their pending states. There is no
  UPDATE or DELETE policy on any table at all.
- **Progress bars move on accepted evidence, never on an announcement.**
- **Receipts and proofs answer different questions.** A receipt shows the
  promise *was made*; a proof shows whether it was *kept*. Officials contest the
  first one first, which is why the UI is loud about a receipt that is a bare
  link with no archived screenshot behind it.
- **Nothing the ingestion pipeline finds publishes itself.** Candidates go to a
  queue; a human promotes them. Do not add an auto-publish path.
- `react-hooks/purity` is switched off for `src/app/**/page.tsx` only, because
  reading the clock is the entire job of those files. Client components are not
  exempt.

## Verify before claiming done

```bash
npm run typecheck
npm run lint
npm run build
```
