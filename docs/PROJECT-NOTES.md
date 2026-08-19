# Vaada: project notes and handoff

Everything a new person (or a new AI session) needs to continue this project cold.
Read this first, then `README.md` for the public description and
`CONTRIBUTING.md` for the editorial rules.

Last updated: 16 August 2026.

---

## 1. What this is

A public register of promises made by government officials in India, with live
countdowns to the deadlines they set themselves, and citizen-submitted evidence
of whether the work actually happened.

Built after the July–August 2026 wave of school protests across India, where
students won public commitments (repairs in a week, seven rooms in three months,
a road in 48 hours) and then had no way to hold anyone to them.

- **Repo:** https://github.com/maheepatel/Vaada (branch `main`)
- **Local:** `D:\Vibe coing apps\vaada`
- **Dev server:** port **5300** (`npm run dev`)
- **Deployed:** not yet
- **Database:** Supabase schema written, **not connected**. The app runs fine
  without it, serving the founding register from `src/data/seed.ts`.

---

## 2. Current state

13 commits. Build, lint and typecheck all pass. 91 pages generate.

**Register contents:** 34 commitments, 12 receipts, 6 proofs, 6 complaints,
across Rajasthan, Uttar Pradesh, Bihar, Madhya Pradesh, Maharashtra and
Jharkhand. Every row traceable to a published source.

### Routes

| Route | What it is |
| --- | --- |
| `/` | Treemap map of states, stat ribbon, closest deadlines |
| `/rankings` | State and district league tables, speed, categories, all issues |
| `/register` | Full filterable list |
| `/deadlines` | Live countdowns bucketed by horizon |
| `/authority` + `/authority/[slug]` | Per-official records and kept rates |
| `/complaints` + `/complaints/new` | Complaints register and filing |
| `/submit` | Paste a post, get drafted commitments |
| `/review` | Moderation queue (token-gated, noindex) |
| `/method` | The full colour rule set |
| `/p/[slug]` | One promise: clock, source, receipts, evidence, timeline |
| `/s/[state]` + `/s/[state]/[district]` | Drill-down |

### API

`/api/proof`, `/api/complaint`, `/api/receipt`, `/api/submit`, `/api/watch`,
`/api/cron/ingest`, `/api/cron/alerts`

### Library layout

```
src/lib/
  types.ts       domain model. Read first.
  status.ts      urgency bands, ramp thresholds, rollups. Pure.
  scoreboard.ts  league tables with sample-size guards
  authority.ts   rolls promises up by the official who owns them
  treemap.ts     squarified treemap (Bruls, Huizing & van Wijk)
  extract.ts     text -> draft commitments (durations, named officials)
  ingest.ts      news source registry, feed parsing, candidate building
  alerts.ts      breach detection + notice composition. Cannot reach network.
  mailer.ts      the only thing that can send. Resend adapter.
  geo.ts         India lookups; every level accepts free text
  archive.ts     Wayback links so sources survive deletion
  format.ts      locale-pinned en-IN / Asia/Kolkata
  data.ts        Supabase if configured, seed file otherwise
```

### Not built

- No accounts. `/review` uses a shared token, which is thin and says so.
- No one-click accept in the review queue; promotion is done in the database.
- Watcher confirmation emails are not sent, so double opt-in is incomplete.
- **No official has a verified email**, so every breach notice suppresses
  itself. That is correct behaviour, not a bug: addresses are never guessed.
- Sub-district and village geo coverage is limited to places already in the
  register. The LGD/UDISE import path is documented but unwritten.
- Seconding a complaint and corroborating a proof are not wired up.
- **No test suite.** `npm run check:extract` covers the deadline parser only.

---

## 3. Rules that are load-bearing

Break these and the product breaks, not just a benchmark.

**1. The status engine never calls `Date.now()`.**
`now` is an explicit argument everywhere in `status.ts`. Server components read
the clock once per request and thread it down; `Countdown` is seeded with the
server's value so the first client render matches. Break this and you get
hydration mismatches, or tiles whose colour depends on when a component
happened to re-render.

**2. A red tile is a claim about evidence, not about a person.**
The wording everywhere is "the deadline passed with no verified proof of
completion". This register names real officials. That phrasing is the difference
between a record and a defamation problem. Never soften it into "they failed".

**3. Nothing automated may write to `commitments`.**
The daily sweep writes candidates to a review queue. A pipeline that decides on
its own that a named minister promised something, and paints it on a public map,
will eventually be wrong about a real person, and one such row discredits every
correct row beside it. Do not add an auto-publish path.

**4. Progress moves on accepted evidence, never on an announcement.**
Only a reviewer changes `progress`. The API routes cannot touch it.

**5. Contact addresses are never guessed; alerts are off by default.**
Sending needs `ALERTS_ENABLED`; writing to officials needs
`ALERTS_NOTIFY_AUTHORITIES` on top of it. Two flags because mailing a follower
and mailing a minister are not the same risk. A unique index pins one notice per
promise per kind per audience, forever, so this cannot become a repeating mailer.

**6. RLS has no UPDATE or DELETE policy anywhere.**
The anon key can SELECT the public tables and INSERT into the three intake
tables, pinned by `WITH CHECK` to their pending states. Moderation runs through
the service role. If a feature seems to need a public update, it needs a
different design.

---

## 4. Bugs found and fixed (do not reintroduce)

**League table ranked the worst performer first.** The sort put all
non-provisional rows above provisional ones *before* comparing scores, so
Rajasthan on a score of 0 sat above Jharkhand on 79 purely because Rajasthan had
crossed the threshold for a third decided promise. Having more evidence promoted
the worst performer. Fixed: sort by score, full stop. Confidence is a label,
never a sort key.

**Delivery-speed metric measured the wrong thing.** It used `elapsed`, which is
distance from the deadline *as of now*, so every kept promise past its date read
"100% of window used". Now reads the completion moment off the audit trail.

**Kept promises showed an overdue countdown.** A promise marked delivered was
counting up past its deadline. Any new UI that renders a clock must check
`band !== 'kept'` first.

**Mosaic tile text was sliced mid-word.** Fixed with container queries: each
tile is a size container and the label is sized in `cqh`/`cqw`, so a fixed line
count fits whatever shape the container is. An earlier heuristic guessed line
count from tile height as a percentage of the mosaic; it was calibrated on a 5:4
container and broke instantly on a 16:7 one.

**Extractor read descriptive durations as deadlines.** "A three-week-long
protest" became a three-week deadline. `scripts/check-extract.ts` guards this;
add every new false positive found in the review queue.

**Cross-state district tagging.** A Jharkhand story was tagged with a Gujarat
district. District lookup is now scoped to the guessed state.

---

## 5. Gotchas learned the hard way

- **X/Twitter returns HTTP 402 to anonymous requests.** Tweets and their replies
  cannot be read programmatically. The `/submit` paste flow exists because of
  this. Do not waste time trying to scrape X without a paid key.
- **Google News RSS links are a 600KB JavaScript shell, not a redirect.** There
  is no article behind them. That is what `IngestSource.fetchable` encodes:
  publisher feeds yield dated drafts, Google News queries only yield leads.
- **Filter articles on topic, not on promise language.** "Officials assured
  repairs within 15 days" is in paragraph six, never the headline. Screening
  headlines for promise wording returned zero candidates for every run.
- **Renaming an app directory while `next dev` runs panics Turbopack** and 404s
  unrelated routes. `rm -rf .next/dev` and restart.
- **Headless Chrome ignores small `--window-size` for layout** and crops the
  screenshot instead. `scripts/screenshots.mjs` uses CDP
  `Emulation.setDeviceMetricsOverride`, which is the only thing that works.
- **The geo dataset is a convenience, never a gate.** Every level accepts free
  text. A register that refuses to record a promise made in a village it has not
  heard of is useless exactly where it is needed most.
- `react-hooks/purity` is off for `src/app/**/page.tsx` only, because reading
  the clock is those files' entire job. Client components are not exempt.

---

## 6. Live ingestion pipeline

`/api/cron/ingest` runs daily (01:30 in `vercel.json`).

Last live run: 597 feed items → 24 articles fetched → 3 dated drafts + 33 leads.

Sources are in two tiers in `src/lib/ingest.ts`:
- **Publisher feeds** (Indian Express, Hindustan Times, The Hindu, Times of
  India) carry real article URLs, so bodies are fetched and deadlines parsed.
- **Discovery feeds** (Google News queries) give reach but unreadable links, so
  they only ever produce leads for a human.

`/api/cron/alerts` runs at 03:00. Last preview: 3 breaches found, all three
authority notices **suppressed** for want of a verified contact address, which is
the designed behaviour.

Vercel's cron scheduler needs a Pro plan. On free tiers the routes still work
when called externally with `Authorization: Bearer $CRON_SECRET`.

---

## 7. The hackathon situation

**Build What Movies India** (buildwhatmovesindia.com), presented by Varun Mayya.

- **Deadline: 27 August 2026.** Finale 5–6 September.
- Teams of up to 4, registrant 18+.
- Deliverables: live demo link, video of 3 minutes maximum, written explanation
  (problem, users, approach, tools, Codex's role, what is functional vs mocked,
  limitations), optional repo link.
- Judging, six equally weighted: Problem, Working build, Usability, Product
  thinking, End-to-end thinking, **Honesty**.
- Finalists get ChatGPT/Codex Pro for a year, credits, goodies, filmed demo.

### Two blockers

**Codex is mandatory.** The FAQ: *"Is Codex mandatory? Yes, for the prototype
submitted to this hackathon."* This codebase was built with Claude Code. As it
stands it does not qualify, and misrepresenting that would fail the Honesty
criterion directly.

**It is a pre-existing project.** *"The submission should be made for this
hackathon"*, and do not *"submit an old project with only small changes."*

### The reframe that works

Scope is wider than it first appears: *"Choose one specific problem within a
public-service website or digital journey, or rethink the entire experience."*
The brief's own problem list includes **grievances**.

India's grievance website is **CPGRAMS** (pgportal.gov.in). The numbers:

- ~27 lakh grievances a year, up roughly 9x from 3 lakh in 2014
- 2,08,103 pending as of April 2025
- **62% satisfaction**, so roughly 10 lakh people a year are dissatisfied
- 5,845 pending over 90 days

The insight: **CPGRAMS measures *disposal*, not *resolution*.** A grievance
marked disposed is closed, not necessarily fixed. That gap is precisely this
project's existing thesis. Rebuild the core in Codex as a rethink of the
grievance journey: file it, get a real deadline and a named owner, get a
countdown, and close it with evidence rather than a disposal stamp.

Vaada then becomes disclosed prior art and research, which is a strength.

---

## 8. Design direction for the rebuild

The audience changed. This was built as a tool for a journalist; it now needs to
be a tool for the public, including people who cannot read comfortably.

### The single biggest change

**The treemap is the wrong front door.** It is information-dense and looks
impressive, but reading it requires knowing that area means magnitude and colour
means time remaining. Nobody learns that on a phone in a village. Keep it as a
secondary "full map" for reporters. The home page should be a card feed.

### Borrow two mental models everybody already has

**The food-delivery tracker.** Order placed → preparing → on the way →
delivered, with a photo. A government promise is the same shape: promise made →
work started → deadline running → done, with a photo. Requires zero teaching.

**The UPI receipt.** Big tick, amount, to whom, timestamp, reference number,
share button. Render every closed promise as a receipt with before/after photos.

### Concrete changes

| Now | Should be |
| --- | --- |
| Treemap on the home page | Card feed, promises near you first |
| 9 colour bands | **3 states: Waiting / Late / Done** |
| Colour carries meaning | Icon **+** colour **+** word |
| Nation-first | Location-first (your district) |
| Top nav strip | Bottom tab bar |
| Paragraphs of explanation | One line; detail on the inner page |
| Text-heavy proof cards | Photo-first, before and after |

Collapsing 9 bands to 3 is the fix for "the site is confusing". Keep the 9-band
model in the engine, since the rankings depend on it; show the public three
words, with an analyst toggle for the rest.

### Research backing

Google's Next Billion Users work identifies four constraints: cost (low RAM),
connectivity (intermittent), digital literacy (users do not know patterns and
icons we assume), general literacy (some cannot read). Prescriptions: minimise
text input, never build hierarchy only language explains, lean on icons, support
multiple languages.

Order-tracker research: present the latest update prominently, keep the core
process to a few steps, push detail into sub-statuses, keep past/current/next
visually distinct. Familiar patterns work because they reduce cognitive strain.

### The tension to design for deliberately

Proof-heavy and low-bandwidth pull against each other. Photos of schools will be
the heaviest thing on the page and the users are on cheap phones and patchy
networks. Thumbnails small and lazy-loaded, full images only on tap. Get this
wrong and the proof feature makes the app unusable for exactly the people it is
for.

---

## 9. Commands

```bash
npm run dev            # port 5300
npm run build
npm run typecheck
npm run lint
npm run check:extract  # deadline parser guard
npm run db:seed        # needs SUPABASE_SERVICE_ROLE_KEY
node scripts/screenshots.mjs   # regenerates README images
```

Deployment steps are in `DEPLOY.md`. Environment variables and the warnings
about which switches send real email are in `.env.example`.
