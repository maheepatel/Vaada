# Deploying Vaada

The app runs with **no configuration at all** — it reads the founding register
from `src/data/seed.ts`. So the fastest path to a live URL you can share for
feedback is: deploy first, wire the database later.

---

## 1. Push to GitHub

```bash
gh repo create vaada --public --source=. --remote=origin --push
```

Or create the repo in the browser and:

```bash
git remote add origin https://github.com/<you>/vaada.git && git push -u origin master
```

## 2. Deploy to Vercel

```bash
npx vercel
```

Follow the prompts (link to your account, accept the defaults — it detects
Next.js). Then promote it:

```bash
npx vercel --prod
```

That is enough for a shareable link. Everything on the site works except
storing submissions.

**Note on the cron jobs.** `vercel.json` schedules the daily news sweep and the
deadline sweep. Scheduled functions need a Vercel Pro plan; on Hobby the routes
still exist and can be called by hand or from any external scheduler
(cron-job.org, GitHub Actions) with the `Authorization: Bearer $CRON_SECRET`
header.

## 3. Environment variables

Set these in the Vercel dashboard under Settings → Environment Variables, or:

```bash
npx vercel env add NEXT_PUBLIC_SITE_URL production
```

Minimum for a public site that accepts submissions:

| Variable | Why |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | your real origin — links inside alerts use it |
| `NEXT_PUBLIC_SUPABASE_URL` | enables writes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | enables writes |
| `SUPABASE_SERVICE_ROLE_KEY` | seeding and moderation only, never public |
| `CRON_SECRET` | **required in production** — without it the cron routes refuse every request |
| `REVIEW_TOKEN` | opens `/review` |

Leave every `ALERTS_*` variable unset for now. See below.

## 4. Supabase (optional, but needed for submissions)

1. Create a project at supabase.com.
2. SQL Editor → paste all of `supabase/schema.sql` → Run.
3. Put the URL and anon key in Vercel.
4. Seed it:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed
```

---

## Before you turn alerts on — read this

Alerts send email to real people in your name. They are off by default and the
sweep runs indefinitely as a **dry run**, recording every notice it *would* have
sent so you can read them first.

```bash
curl -s "$SITE/api/cron/alerts?preview=1" -H "Authorization: Bearer $CRON_SECRET"
```

Read several days of that output before changing anything. Then:

- `ALERTS_ENABLED=true` — starts email to people who *asked* to be told when a
  deadline runs out. Low risk.
- `ALERTS_NOTIFY_AUTHORITIES=true` — starts email to named government
  officials. This is a **separate switch on purpose.** Do not set it in the same
  session as the first one.

You also need `RESEND_API_KEY`, a verified sending domain, and `ALERTS_FROM` on
that domain. And no official can be written to until somebody adds a verified
`email` plus its `contactSource` — addresses are never guessed, which is why
every authority notice currently suppresses itself.

## Things to check once it is live

```bash
curl -s "$SITE/api/cron/ingest?preview=1" -H "Authorization: Bearer $CRON_SECRET" | head -c 400
```

- `/` — the map should be visible without scrolling on a laptop
- `/scoreboard` — league tables
- `/submit` — type "raj" in the state field; Rajasthan should appear
- `/review?token=$REVIEW_TOKEN` — the queue

## Collecting feedback

The fastest useful signal is watching someone use it without narration. Two
things worth asking specifically, because they are the assumptions the whole
design rests on:

1. Within ten seconds of landing, can they say how many promises were kept and
   how many were missed?
2. Do they read a red tile as *"the evidence is missing"* or as *"this person is
   guilty"*? The site is written carefully to mean the first. If readers hear
   the second, the wording needs to change, not the readers.
