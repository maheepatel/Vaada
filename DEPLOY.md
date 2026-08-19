# Hosting Vaada

The app runs with **no configuration at all**. With zero environment variables
it serves the founding register from `src/data/seed.ts`, and every page works
except storing submissions. So the fastest route to a shareable link is: deploy
first, wire the database afterwards.

Verified before writing this: `npm run build` succeeds with no `.env` present,
producing 83 pages.

---

## The files that do the hosting

Everything needed is already committed. Nothing else to create.

| File | What it does |
| --- | --- |
| `package.json` | `build` and `start` scripts. Vercel and Render both detect Next.js from this. |
| `next.config.ts` | Intentionally empty. No custom server, no rewrites, no image domains. |
| `vercel.json` | Schedules the two daily cron routes. |
| `.env.example` | Every variable, with warnings on the ones that send real email. |
| `.gitignore` | Ignores `.env*` but keeps `.env.example`. |
| `supabase/schema.sql` | Tables, constraints, RLS. Run once in the SQL editor. |
| `scripts/seed.ts` | Loads the founding register into a fresh database. |

There is **no Dockerfile and no `output: standalone`**, because Vercel needs
neither. If you host somewhere that wants a container, say so and it is a small
addition rather than something to retrofit.

---

## Option A: Vercel (recommended)

Vercel builds Next.js without configuration and gives you a URL in a couple of
minutes.

### 1. Log in

```bash
npx vercel login
```

This opens a browser and asks you to confirm. It cannot be automated, which is
why the link below had to come from you rather than from me.

### 2. Deploy a preview

```bash
npx vercel
```

Accept the defaults. It detects Next.js, builds, and prints a preview URL.

### 3. Promote to production

```bash
npx vercel --prod
```

You now have a permanent URL such as `vaada.vercel.app`. That is the link to
share for feedback.

### 4. Set the environment variables

This is the step that decides whether the intake forms work on the live site.
Miss it and the deployed app still renders the register, but every submission
is validated and thrown away — exactly the behaviour described in
`docs/SUPABASE-SETUP.md`.

**Where to paste them:** Vercel dashboard → your project → **Settings** →
**Environment Variables** → **Add New**.

For each one, tick all three environments (**Production**, **Preview**,
**Development**) unless the notes below say otherwise. Vercel keeps them
encrypted at rest and they are never written into the repository.

| Variable | Value to paste | Environments |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | all three |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` | all three |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` `secret` | all three |
| `NEXT_PUBLIC_SITE_URL` | your real domain, e.g. `https://vaada.vercel.app` | all three |
| `REVIEW_TOKEN` | the long random string from your `.env.local` | all three |
| `CRON_SECRET` | the long random string from your `.env.local` | all three |
| `ALERTS_ENABLED` | `false` | all three |
| `ALERTS_NOTIFY_AUTHORITIES` | `false` | all three |

To read the two secrets out of your local file without opening it:

```bash
grep -E '^(REVIEW_TOKEN|CRON_SECRET)=' .env.local
```

**Never** paste `SUPABASE_SERVICE_ROLE_KEY` into a variable whose name begins
`NEXT_PUBLIC_`. That prefix is what tells Next.js to inline a value into the
JavaScript bundle every visitor downloads. The service-role key bypasses every
row-level security policy in the database; inlining it would hand full read and
write access to anyone who opens DevTools.

### 5. Point Supabase at the deployed domain

Two settings in the Supabase dashboard have to know your Vercel URL, or auth
silently fails in production while working perfectly on localhost.

1. **Authentication → URL Configuration → Site URL** — set it to your Vercel
   domain, e.g. `https://vaada.vercel.app`.
2. **Authentication → URL Configuration → Redirect URLs** — add the same
   domain with a wildcard path: `https://vaada.vercel.app/**`.

### 6. Confirm anonymous sign-ins are still on

**Authentication → Sign In / Providers → Anonymous sign-ins.** This is the same
toggle from the local setup and it is per-project, not per-environment, so if
you switched it on for local development it is already on. If it is off:
uploads fail, `user_id` is never stamped, and `/my` is permanently empty,
because every own-row policy compares against `auth.uid()`.

While you are there, **Authentication → Rate Limits** governs how fast
anonymous identities can be created. The default of 30/hour per IP is a
reasonable starting point for a public site.

### 7. Redeploy and verify

Environment variables are read at build time, so existing deployments do not
pick them up. Trigger a fresh one:

```bash
npx vercel --prod
```

Then on the live site, in order:

1. Open `/` — the map renders.
2. Open `/submit`, press **Use the example**, pick a state, and try to submit
   with no evidence. The button stays disabled.
3. Add a link, submit, and expect `Queued N promises for review.`
4. Supabase → Table Editor → `submissions`. Your row is there with a
   `user_id` and a computed `evidence_tier`.
5. Open `/my` — the submission is listed.
6. Open `https://YOURSITE/review?token=YOUR_REVIEW_TOKEN` and accept it.
7. The promise now appears on the map and its state and district pages.

If step 3 reports that no database is connected, the variables were added but
the project was not redeployed after adding them.

### A note on the cron jobs

Vercel's scheduler needs a **Pro** plan. On the free tier the two routes still
exist and work; they just are not called automatically. Any external scheduler
can call them:

```bash
curl -X GET "https://YOURSITE/api/cron/ingest" -H "Authorization: Bearer $CRON_SECRET"
```

cron-job.org or a GitHub Actions schedule both do this fine.

---

## Option B: Netlify

```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

Netlify runs Next.js through its own adapter. Everything works, but `vercel.json`
is ignored, so the crons must be scheduled externally as above.

---

## Option C: any Node host (Render, Railway, a VPS)

```bash
npm ci
npm run build
npm start          # serves on $PORT, default 3000
```

Set the same environment variables in the host's dashboard. Cron goes in the
host's scheduler or a system crontab.

---

## Connecting Supabase

Only needed once you want submissions to persist.

1. Create a project at supabase.com.
2. **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
3. Copy the project URL and the anon key into your host's env vars.
4. Load the founding register:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed
```

The schema creates the `proof-media` storage bucket and the row-level security
policies. Read the comments in that file before changing any of it: the public
can read everything and insert only into the three intake tables, and there is
deliberately no UPDATE or DELETE policy anywhere.

---

## Before you ever turn alerts on

This is the one part that can do something you cannot take back. Alerts send
email to real people, in your name, without a human reading each message.

They are off by default and the sweep runs indefinitely as a dry run, recording
every notice it *would* have sent. Read a few days of that first:

```bash
curl -s "https://YOURSITE/api/cron/alerts?preview=1" -H "Authorization: Bearer $CRON_SECRET"
```

Then, and only then:

- `ALERTS_ENABLED=true` starts email to people who **asked** to be told when a
  deadline runs out. Low risk.
- `ALERTS_NOTIFY_AUTHORITIES=true` starts email to **named government
  officials**. This is a separate switch on purpose. Do not set it in the same
  session as the first one.

You also need `RESEND_API_KEY`, a verified sending domain, and `ALERTS_FROM` on
that domain. Note that no official currently has a verified address, so every
authority notice suppresses itself until somebody adds one with its
`contactSource`. That is correct behaviour, not a bug.

---

## Smoke test once it is live

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://YOURSITE/
```

Then by hand:

- `/` map visible without scrolling, on a laptop and on a phone
- `/scoreboard` league tables render and scroll sideways on mobile
- `/submit` type "raj" in the state field, Rajasthan should appear
- `/p/jodhawas-commuting-road` the countdown is ticking
- `/review?token=YOUR_TOKEN` the queue opens

---

## Collecting feedback

The most useful signal is watching someone use it without narration. Two
questions are worth asking directly, because they test the assumptions the
whole design rests on:

1. Within ten seconds of landing, can they say how many promises were kept and
   how many were missed?
2. Do they read a red tile as *"the evidence is missing"* or as *"this person is
   guilty"*? The site is written to mean the first. If readers hear the second,
   the wording needs to change, not the readers.
