# Connecting Supabase

Everything below takes about fifteen minutes. The app runs without any of it —
it serves the founding register from `src/data/seed.ts` — but until this is
done **nothing anyone submits is stored**. The form reports success and the row
is discarded, because `/api/submit` returns early when no database is present.

---

## 1. Create the project

1. Go to <https://supabase.com/dashboard> and sign in.
2. **New project**. Give it a name, a strong database password, and pick the
   region closest to your users — `ap-south-1` (Mumbai) for India.
3. Wait for it to finish provisioning. Two or three minutes.

## 2. Create the tables

1. In the left sidebar: **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy the whole file, paste it in.
3. Press **Run**.

It is safe to run more than once. Every statement is guarded with
`if not exists`, `drop policy if exists`, or an exception handler, so a second
run changes nothing.

You should see `Success. No rows returned`. If you get an error mentioning
`auth.users`, the project has not finished provisioning — wait a minute and run
it again.

## 3. Turn on anonymous sign-ins

**This one is easy to miss and nothing works without it.**

1. Sidebar: **Authentication** → **Sign In / Providers**.
2. Find **Anonymous sign-ins**. Turn it **on**. Save.

This is what lets a visitor log a promise without creating an account. Every
reader silently gets a real `auth.uid()`, which is what stamps their
submissions so they can find them again under **My logs**, and what the
storage policy checks before accepting an upload.

While you are here, under **Authentication → Rate limits**, the default
anonymous sign-in limit is 30/hour per IP. That is fine to start with.

## 4. Copy your keys

Sidebar: **Project Settings** → **API**. You need three values:

| Dashboard label | Goes into |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

The `service_role` key bypasses every row-level security policy in the
database. Treat it like the database password itself.

## 5. Paste them into this exact file

Create a file at this exact path:

```
D:\Vibe coing apps\vaada\.env.local
```

It does not exist yet and it is **not** in git — `.gitignore` carries
`.env*` with an exception only for `.env.example`, so this file can never be
committed by accident. Nothing you paste here reaches GitHub.

Copy `.env.example` into it and fill in these five lines:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:5300
REVIEW_TOKEN=<any long random string you invent>
```

`REVIEW_TOKEN` is yours to make up. It is the only thing standing in front of
`/review`, so make it long and random rather than memorable.

Leave `ALERTS_ENABLED` and `ALERTS_NOTIFY_AUTHORITIES` as `false`. Those send
real email to real officials and are deliberately off.

## 6. Restart the dev server

Next.js reads the environment at boot, so a running server will not pick this
up. Stop it and start it again:

```bash
npm run dev
```

## 7. Load the founding register

```bash
npm run db:seed
```

This needs `SUPABASE_SERVICE_ROLE_KEY`, because RLS forbids the anon key from
writing to `commitments` — which is the whole point of the security model.

Reload <http://localhost:5300>. The map should look identical. That is the
correct result: `data.ts` now reads from Supabase instead of the seed file, and
the register is the same either way.

---

## Testing the backend end to end

### The form

1. Open <http://localhost:5300/submit>.
2. Press **Use the example** to fill the text box.
3. Pick a state.
4. **Try to submit without evidence.** The button is disabled and the form
   says `Add a photo or a link before submitting.` That is the first of the
   three proof checks.
5. Paste any link into the source URL field. The button enables and a chip
   appears reading `Evidence: Link only`.
6. Attach an image instead and the chip becomes `Evidence: Photo or scan`.
   Tick "signed" with an image attached and it reads `Evidence: Signed
   document`. This is weight, not a gate — a link still goes through.
7. Submit. You should get `Queued N promises for review.`

### That it actually stored

Dashboard → **Table Editor** → `submissions`. Your row is there with
`review_status = 'queued'`, a `user_id` filled in, and `evidence_tier` computed
by Postgres.

### That the proof rule cannot be bypassed

The form check can be skipped by posting straight at the endpoint. Try it:

```bash
curl -s -X POST http://localhost:5300/api/submit -H "Content-Type: application/json" -d "{\"rawText\":\"A test post long enough to pass the minimum length check for this endpoint.\",\"state\":\"Rajasthan\",\"commitments\":[{\"title\":\"Repair the classroom roof\"}]}"
```

It returns 400 and the message about evidence. Even if that check were removed,
the `submission_has_proof` constraint in Postgres would reject the insert.

### My logs

Open <http://localhost:5300/my>. Your submission is listed as **Waiting for
review**. Open the same page in a private window — it is empty, because the
`read own submissions` policy compares `user_id` against `auth.uid()` and a
different browser is a different identity.

### The review queue

Open `http://localhost:5300/review?token=<your REVIEW_TOKEN>`.

Your submission appears under **Submitted by people** with an **Accept onto the
register** button. It asks twice: the first press arms it, the second publishes.

Press it through. Then check:

- `commitments` in the Table Editor has the new rows
- `receipts` has the archived evidence attached to them
- the `submissions` row is now `accepted`
- **the promise now appears on the home map, and on its state and district
  pages** — no extra step, because every view reads the same table

Reject instead and the row is marked `rejected` and stays in the table. Nothing
is ever deleted, so any decision can be audited afterwards.

---

## What is deliberately not automatic

`/api/cron/ingest` writes only to `ingest_candidates`, never to `commitments`.
Sweep candidates have **no** accept button — machine output naming a real
official should cost a reviewer more effort than one click, not less. A
pipeline that publishes its own guesses will eventually be wrong about a real
person, and one such row discredits every correct row beside it.

## If something fails

**`column ... does not exist` on submit** — `schema.sql` was not re-run after
the v2 section was added. Run the whole file again.

**`new row violates row-level security policy`** — anonymous sign-ins are off.
Step 3.

**Uploads fail with a storage error** — same cause. The bucket policy now
requires a session, and images are capped at 5 MB and limited to JPEG, PNG,
WebP, HEIC and PDF.

**`/review` says not authorised** — the token in the URL does not match
`REVIEW_TOKEN`, or the server was not restarted after setting it.
