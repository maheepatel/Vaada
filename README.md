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
| `/p/[slug]` | one promise: live clock, evidence, audit trail, who answers |
| `/register` | the full list with filters |
| `/deadlines` | live countdowns bucketed by horizon |
| `/complaints` | complaints register |
| `/submit` | paste a post, get drafted commitments |
| `/method` | the full rule set behind the colours |

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
- `react-hooks/purity` is switched off for `src/app/**/page.tsx` only, because
  reading the clock is the entire job of those files. Client components are not
  exempt.

## Verify before claiming done

```bash
npm run typecheck
npm run lint
npm run build
```
