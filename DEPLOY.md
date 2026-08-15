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

### 4. Set the variables you actually need

In the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Needed for | If missing |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | correct links inside alert emails | links point at localhost |
| `CRON_SECRET` | protecting `/api/cron/*` | **cron routes refuse every request in production** |
| `REVIEW_TOKEN` | opening `/review` | the queue stays shut |
| `NEXT_PUBLIC_SUPABASE_URL` | storing submissions | submissions validate but are not saved |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | storing submissions | as above |
| `SUPABASE_SERVICE_ROLE_KEY` | seeding, moderation, cron reads | server-only, never expose |

Leave every `ALERTS_*` variable unset for now. See the warning further down.

Redeploy after adding them: `npx vercel --prod`.

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
