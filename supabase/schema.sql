-- Vaada — Postgres schema for Supabase.
--
-- Run this in the SQL editor of a new project, then run seed.sql.
--
-- The security model in one line: anybody may READ everything and may INSERT
-- into the three intake tables (proofs, complaints, submissions); nobody may
-- UPDATE or DELETE anything with the anon key. Reviewers act through the
-- service role. That is what lets the register be openly contributed to and
-- still be worth citing.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----

do $$ begin
  create type commitment_status as enum
    ('unanswered', 'promised', 'in_progress', 'fulfilled', 'broken', 'disputed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type category as enum
    ('education', 'infrastructure', 'water', 'health', 'safety', 'jobs', 'governance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proof_kind as enum
    ('photo', 'video', 'document', 'measurement', 'testimony');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proof_verdict as enum ('pending', 'verified', 'rejected', 'contested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submitter_kind as enum
    ('resident', 'volunteer', 'journalist', 'official', 'anonymous');
exception when duplicate_object then null; end $$;

do $$ begin
  create type complaint_status as enum
    ('open', 'acknowledged', 'resolved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type receipt_kind as enum
    ('social_post', 'written_order', 'minutes', 'video', 'press_report');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_kind as enum ('breach', 'due_soon', 'status_change');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_state as enum
    ('queued', 'sent', 'failed', 'suppressed', 'dry_run');
exception when duplicate_object then null; end $$;

do $$ begin
  create type watcher_role as enum ('logger', 'follower', 'journalist', 'official');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------- commitments ----

create table if not exists commitments (
  id             text primary key,
  slug           text not null unique,
  title          text not null,
  detail         text not null default '',

  state          text not null,
  state_slug     text not null,
  district       text,
  district_slug  text,
  locality       text not null default '',

  category       category not null,
  status         commitment_status not null default 'promised',

  promised_on    timestamptz not null,
  -- Null is meaningful: it records that no date was ever given.
  deadline       timestamptz,
  -- The wording actually used, e.g. 'within one week'. Kept verbatim so the
  -- register can be checked against the source without following the link.
  deadline_label text,

  -- 0-100, moved only by a reviewer accepting evidence.
  progress       int not null default 0 check (progress between 0 and 100),
  weight         int not null default 1 check (weight between 1 and 5),
  beneficiaries  bigint,

  accountable    jsonb not null default '[]'::jsonb,
  demanded_by    text not null default '',
  sources        jsonb not null default '[]'::jsonb,
  timeline       jsonb not null default '[]'::jsonb,

  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now(),

  -- A commitment must either have both a deadline and the phrase it came from,
  -- or neither. A date with no quoted wording cannot be defended later.
  constraint deadline_has_wording
    check ((deadline is null) = (deadline_label is null))
);

-- Finer location, added so a promise can be pinned to the exact institution.
-- All nullable: a state-wide commitment has none of them, and refusing a row
-- because nobody knew the block name would lose exactly the promises that
-- matter most.
alter table commitments add column if not exists subdistrict text;
alter table commitments add column if not exists village     text;
alter table commitments add column if not exists school      text;
-- The national school code. Worth its own column because it is the join key to
-- official enrolment and infrastructure data.
alter table commitments add column if not exists udise       text
  check (udise is null or udise ~ '^[0-9]{11}$');
alter table commitments add column if not exists pincode     text
  check (pincode is null or pincode ~ '^[1-9][0-9]{5}$');

create index if not exists commitments_state_idx    on commitments (state_slug);
create index if not exists commitments_udise_idx    on commitments (udise)
  where udise is not null;
create index if not exists commitments_district_idx on commitments (state_slug, district_slug);
create index if not exists commitments_deadline_idx on commitments (deadline)
  where deadline is not null;
create index if not exists commitments_status_idx   on commitments (status);

-- ---------------------------------------------------------------- proofs ----

create table if not exists proofs (
  id             uuid primary key default gen_random_uuid(),
  commitment_id  text not null references commitments (id) on delete cascade,
  kind           proof_kind not null,
  claim          text not null check (char_length(claim) >= 15),
  -- Whether this evidence argues the work WAS done or was NOT. Making the
  -- submitter commit to a direction is what makes the counts meaningful.
  direction      text not null check (direction in ('supports', 'refutes')),
  submitted_by   text not null default 'Anonymous',
  submitter_kind submitter_kind not null default 'anonymous',
  submitted_at   timestamptz not null default now(),
  media_urls     text[] not null default '{}',
  verdict        proof_verdict not null default 'pending',
  reviewed_by    text,
  review_note    text,
  corroborations int not null default 0
);

create index if not exists proofs_commitment_idx on proofs (commitment_id);
create index if not exists proofs_verdict_idx    on proofs (verdict);

-- -------------------------------------------------------------- receipts ----

-- Proof the promise was MADE, as opposed to `proofs`, which is about whether
-- it was kept. Kept separate because they answer different questions and get
-- contested by different people.
create table if not exists receipts (
  id            uuid primary key default gen_random_uuid(),
  commitment_id text not null references commitments (id) on delete cascade,
  kind          receipt_kind not null,
  title         text not null,
  description   text,
  -- Archived copies. The durable half — a bare `url` is one deletion away from
  -- proving nothing.
  media_urls    text[] not null default '{}',
  url           text,
  document_date date not null,
  signed        boolean not null default false,
  quote         text,
  added_by      text not null default 'Anonymous',
  verified      boolean not null default false,
  created_at    timestamptz not null default now(),

  -- Something has to point at the document, or the row is an assertion with
  -- nothing behind it.
  constraint receipt_has_content
    check (url is not null or array_length(media_urls, 1) > 0)
);

create index if not exists receipts_commitment_idx on receipts (commitment_id);

-- -------------------------------------------------------------- watchers ----

-- People who asked to hear when a specific deadline runs out.
create table if not exists watchers (
  id            uuid primary key default gen_random_uuid(),
  commitment_id text not null references commitments (id) on delete cascade,
  email         text not null,
  name          text not null default 'Anonymous',
  role          watcher_role not null default 'follower',
  -- Double opt-in. The alert sweep reads confirmed rows only, so somebody
  -- typing a third party's address in cannot sign them up for mail.
  confirmed     boolean not null default false,
  confirm_token uuid not null default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  unique (commitment_id, email)
);

create index if not exists watchers_commitment_idx on watchers (commitment_id)
  where confirmed;

-- ---------------------------------------------------------------- alerts ----

-- Every notice the system composed, including the ones it deliberately did not
-- send. Dry runs and suppressions are recorded too, so an operator can read
-- exactly what would go out before switching sending on.
create table if not exists alerts (
  id            uuid primary key default gen_random_uuid(),
  commitment_id text not null references commitments (id) on delete cascade,
  kind          alert_kind not null,
  audience      text not null check (audience in ('authority', 'watchers')),
  recipients    text[] not null default '{}',
  subject       text not null,
  body          text not null default '',
  state         alert_state not null default 'dry_run',
  note          text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

create index if not exists alerts_commitment_idx on alerts (commitment_id, kind);
-- The de-duplication index: one notice per promise per kind per audience, ever.
-- This is what stops an accountability tool from becoming a repeating mailer.
create unique index if not exists alerts_once_idx
  on alerts (commitment_id, kind, audience)
  where state in ('sent', 'queued');

-- ----------------------------------------------------- ingest candidates ----

-- Output of the daily sweep. Nothing here is public and nothing here is on the
-- map: a human promotes a candidate into `commitments`, or it stays a candidate.
create table if not exists ingest_candidates (
  id              uuid primary key default gen_random_uuid(),
  fingerprint     text not null unique,
  source_id       text not null,
  source_label    text not null default '',
  headline        text not null,
  url             text not null,
  published_at    timestamptz not null,
  raw_text        text not null default '',
  guessed_state   text,
  guessed_district text,
  -- 'extracted' carries parsed draft rows; 'lead' is a story whose headline
  -- reads like a promise event but whose dates could not be parsed — still
  -- worth a human opening the source, which is the point of the queue.
  tier            text not null default 'lead'
                  check (tier in ('extracted', 'lead')),
  drafts          jsonb not null default '[]'::jsonb,
  review_status   text not null default 'queued'
                  check (review_status in ('queued', 'accepted', 'rejected')),
  reviewed_by     text,
  review_note     text,
  created_at      timestamptz not null default now()
);

create index if not exists ingest_status_idx
  on ingest_candidates (review_status, published_at desc);

-- ------------------------------------------------------------ complaints ----

create table if not exists complaints (
  id                uuid primary key default gen_random_uuid(),
  -- Null when the complaint is about something nobody has promised anything
  -- about yet, which is often the most important kind.
  commitment_id     text references commitments (id) on delete set null,
  state_slug        text not null,
  district_slug     text,
  title             text not null check (char_length(title) >= 10),
  body              text not null check (char_length(body) >= 30),
  category          category not null,
  filed_by          text not null default 'Anonymous',
  filed_at          timestamptz not null default now(),
  status            complaint_status not null default 'open',
  seconded          int not null default 0,
  media_urls        text[] not null default '{}',
  official_response text,
  responded_at      timestamptz
);

create index if not exists complaints_place_idx  on complaints (state_slug, district_slug);
create index if not exists complaints_status_idx on complaints (status);

-- ----------------------------------------------------------- submissions ----

-- The review queue. Nothing here is public until a reviewer promotes it into
-- `commitments`.
create table if not exists submissions (
  id             uuid primary key default gen_random_uuid(),
  source_url     text not null default '',
  publisher      text not null default '',
  raw_text       text not null,
  promised_on    timestamptz not null,
  state          text not null,
  state_slug     text not null,
  district       text,
  district_slug  text,
  locality       text not null default '',
  demanded_by    text not null default '',
  handles        text[] not null default '{}',
  image_count    int not null default 0,
  -- The parser's draft rows, exactly as the submitter approved them.
  drafts         jsonb not null default '[]'::jsonb,
  review_status  text not null default 'queued'
                 check (review_status in ('queued', 'accepted', 'rejected')),
  reviewed_by    text,
  review_note    text,
  created_at     timestamptz not null default now()
);

create index if not exists submissions_status_idx on submissions (review_status, created_at desc);

-- ------------------------------------------------------------------ RLS ----

alter table commitments       enable row level security;
alter table proofs            enable row level security;
alter table complaints        enable row level security;
alter table submissions       enable row level security;
alter table receipts          enable row level security;
alter table watchers          enable row level security;
alter table alerts            enable row level security;
alter table ingest_candidates enable row level security;

-- Public reads. The register is the product; it is meant to be quoted.
drop policy if exists "read commitments" on commitments;
create policy "read commitments" on commitments for select using (true);

drop policy if exists "read proofs" on proofs;
create policy "read proofs" on proofs for select using (true);

drop policy if exists "read complaints" on complaints;
create policy "read complaints" on complaints for select using (true);

-- Anyone may contribute evidence, but only in the pending state. The WITH CHECK
-- is what stops a caller from inserting a row that is already 'verified'.
drop policy if exists "insert pending proofs" on proofs;
create policy "insert pending proofs" on proofs
  for insert with check (
    verdict = 'pending'
    and corroborations = 0
    and reviewed_by is null
    and review_note is null
  );

drop policy if exists "insert open complaints" on complaints;
create policy "insert open complaints" on complaints
  for insert with check (
    status = 'open'
    and seconded = 0
    and official_response is null
  );

drop policy if exists "insert queued submissions" on submissions;
create policy "insert queued submissions" on submissions
  for insert with check (review_status = 'queued' and reviewed_by is null);

-- Receipts are public — the whole point is that anybody can check what was
-- promised — and anybody may add one, unverified.
drop policy if exists "read receipts" on receipts;
create policy "read receipts" on receipts for select using (true);

drop policy if exists "insert unverified receipts" on receipts;
create policy "insert unverified receipts" on receipts
  for insert with check (verified = false);

-- Watchers may only ever be created unconfirmed, and are never readable: the
-- subscriber list for a politically sensitive promise is exactly the kind of
-- thing that must not be enumerable. The alert sweep reads it as service role.
drop policy if exists "insert unconfirmed watchers" on watchers;
create policy "insert unconfirmed watchers" on watchers
  for insert with check (confirmed = false);

-- No policy on `alerts` or `ingest_candidates` at all, which with RLS on means
-- the anon key can neither read nor write them. Alert bodies name individuals
-- and quote residents' evidence; the ingest queue is unreviewed machine output.
-- Neither is fit to be public, and both are read by the service role only.

-- -------------------------------------------------------- update triggers ----

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists commitments_touch on commitments;
create trigger commitments_touch before update on commitments
  for each row execute function touch_updated_at();

-- Submissions are not publicly readable: an unreviewed queue would otherwise be
-- an unmoderated publishing surface wearing the register's credibility.
-- Reviewers read it through the service role.

-- No UPDATE or DELETE policy exists on any table, so the anon key cannot change
-- or remove a single row. Moderation runs through the service role only.

-- -------------------------------------------------------------- storage ----

insert into storage.buckets (id, name, public)
values ('proof-media', 'proof-media', true)
on conflict (id) do nothing;

drop policy if exists "read proof media" on storage.objects;
create policy "read proof media" on storage.objects
  for select using (bucket_id = 'proof-media');

drop policy if exists "upload proof media" on storage.objects;
create policy "upload proof media" on storage.objects
  for insert with check (bucket_id = 'proof-media');

-- ========================================================================
-- v2 — anonymous identity, mandatory proof, and the review promotion path.
--
-- Everything below is idempotent, so this file stays a single "run me" script
-- rather than a chain of migrations. Applying it twice changes nothing.
-- ========================================================================

-- ------------------------------------------------ submissions, completed ----
--
-- These ten columns were written by /api/submit but never existed here, so the
-- very first real submission would have failed on "column does not exist". The
-- app never caught it because without credentials the route returns early and
-- reports success without touching a database.

alter table submissions add column if not exists subdistrict      text;
alter table submissions add column if not exists village          text;
alter table submissions add column if not exists school           text;
alter table submissions add column if not exists udise            text;
alter table submissions add column if not exists pincode          text;
alter table submissions add column if not exists receipt_kind     text;
alter table submissions add column if not exists receipt_signed   boolean not null default false;
alter table submissions add column if not exists receipt_media    text[] not null default '{}';
alter table submissions add column if not exists logged_by_name   text;
alter table submissions add column if not exists logged_by_email  text;

-- --------------------------------------------------- anonymous identity ----
--
-- Every visitor gets a real auth.uid() from Supabase anonymous sign-in without
-- typing anything. That is what makes "my submissions" possible without putting
-- a signup wall in front of somebody reporting a collapsed classroom.
--
-- ON DELETE SET NULL, not CASCADE: if an identity is ever removed, the evidence
-- must survive it. A register that loses rows when an account goes away is not
-- a register.

alter table submissions add column if not exists user_id uuid
  references auth.users (id) on delete set null;
alter table proofs      add column if not exists user_id uuid
  references auth.users (id) on delete set null;
alter table complaints  add column if not exists user_id uuid
  references auth.users (id) on delete set null;
alter table receipts    add column if not exists user_id uuid
  references auth.users (id) on delete set null;

create index if not exists submissions_user_idx on submissions (user_id, created_at desc);
create index if not exists proofs_user_idx      on proofs (user_id);
create index if not exists complaints_user_idx  on complaints (user_id);

-- ------------------------------------------------------ mandatory proof ----
--
-- A promise logged with nothing behind it is an allegation about a named
-- official, which is the one thing this register must never publish. Enforced
-- here as well as in the form and the API route, because the first two can be
-- bypassed by anyone posting straight at the endpoint and this cannot.
--
-- Satisfied by an uploaded image OR any link: post, news story, or document.

do $$ begin
  alter table submissions add constraint submission_has_proof check (
    coalesce(array_length(receipt_media, 1), 0) > 0
    or coalesce(source_url, '') <> ''
  );
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------- evidence tier ----
--
-- Weight, not a gate. A signed order and a forwarded WhatsApp screenshot are
-- both admissible; they are not both worth the same. Turning somebody away
-- because a photograph is all they have would fail exactly the people the
-- anonymous decision is meant to protect, so the weakest tier is still logged
-- and simply labelled as what it is.
--
-- Generated, so a submitter cannot claim a tier they did not earn.

alter table submissions add column if not exists evidence_tier text
  generated always as (
    case
      when receipt_signed and coalesce(array_length(receipt_media, 1), 0) > 0
        then 'signed_document'
      when coalesce(array_length(receipt_media, 1), 0) > 0
        then 'media'
      when receipt_kind = 'press_report'   then 'press_link'
      when receipt_kind = 'written_order'  then 'document_link'
      when coalesce(source_url, '') <> ''  then 'link_only'
      else 'none'
    end
  ) stored;

-- ---------------------------------------------------------- own-row RLS ----
--
-- The queue as a whole stays unreadable: it is unreviewed material naming real
-- people. A submitter may read their own rows and nothing else, which is what
-- turns "my logs" into a query instead of a feature.

drop policy if exists "read own submissions" on submissions;
create policy "read own submissions" on submissions
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "read own proofs" on proofs;
create policy "read own proofs" on proofs
  for select using (auth.uid() is not null and user_id = auth.uid());

-- Inserts may only ever be stamped with the caller's own identity. Passing
-- somebody else's uid is rejected by the check, and passing none is allowed so
-- the route still works before a session exists.

drop policy if exists "insert queued submissions" on submissions;
create policy "insert queued submissions" on submissions
  for insert with check (
    review_status = 'queued'
    and reviewed_by is null
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "insert pending proofs" on proofs;
create policy "insert pending proofs" on proofs
  for insert with check (
    verdict = 'pending'
    and corroborations = 0
    and reviewed_by is null
    and review_note is null
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "insert open complaints" on complaints;
create policy "insert open complaints" on complaints
  for insert with check (
    status = 'open'
    and seconded = 0
    and official_response is null
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "insert unverified receipts" on receipts;
create policy "insert unverified receipts" on receipts
  for insert with check (
    verified = false
    and (user_id is null or user_id = auth.uid())
  );

-- ------------------------------------------------------ storage, tighter ----
--
-- The previous upload policy accepted anything from anyone into a public
-- bucket: any MIME type, any size, unlimited objects. That is a free file host
-- attached to an accountability register, and it would be found. Uploads are
-- now restricted to images and small documents, capped, and require a session.

update storage.buckets
   set public = true,
       file_size_limit = 5242880,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'
       ]
 where id = 'proof-media';

drop policy if exists "upload proof media" on storage.objects;
create policy "upload proof media" on storage.objects
  for insert with check (
    bucket_id = 'proof-media'
    and auth.uid() is not null
  );

-- Nobody may overwrite or remove evidence through the anon key. Replacing a
-- photograph after it has been cited is indistinguishable from tampering.
drop policy if exists "no update proof media" on storage.objects;
drop policy if exists "no delete proof media" on storage.objects;

-- ------------------------------------------------- identity, stamped by PG ----
--
-- The uid is defaulted server-side rather than sent by the caller. A client
-- that never supplies user_id cannot supply the wrong one, which removes an
-- entire class of impersonation bug before it can be written.

alter table submissions alter column user_id set default auth.uid();
alter table proofs      alter column user_id set default auth.uid();
alter table complaints  alter column user_id set default auth.uid();
alter table receipts    alter column user_id set default auth.uid();

-- ========================================================================
-- v3 — abuse limits.
--
-- Measured before writing this: forty submissions were accepted in fifteen
-- seconds from a single laptop, sequentially, with nothing refused. Rows are
-- cheap to create and a review queue is only useful if a human can read it, so
-- an unthrottled intake endpoint is both a hosting bill and a denial of the
-- product's actual function.
--
-- This lives in Postgres rather than in the API route on purpose. Serverless
-- instances share no memory, so an in-process counter resets constantly and
-- counts only its own instance; and a limit in the route can be skipped by
-- anyone posting straight at PostgREST. A trigger cannot be gone around.
-- ========================================================================

create or replace function enforce_intake_rate() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ceiling int := tg_argv[0]::int;
  stamp   text := tg_argv[1];
  recent  int;
begin
  if new.user_id is null then
    -- No identity attached. With anonymous sign-in enabled this should not
    -- happen, so the few that appear share one tight bucket rather than each
    -- getting a private allowance that nobody can attribute.
    ceiling := greatest(ceiling / 4, 3);
    execute format(
      'select count(*) from %I where user_id is null and %I > now() - interval ''1 hour''',
      tg_table_name, stamp
    ) into recent;
  else
    execute format(
      'select count(*) from %I where user_id = $1 and %I > now() - interval ''1 hour''',
      tg_table_name, stamp
    ) into recent using new.user_id;
  end if;

  if recent >= ceiling then
    -- 54000 is program_limit_exceeded. The API route maps it to HTTP 429 and
    -- tells the person to come back later, rather than the generic failure a
    -- constraint violation would produce.
    raise exception 'Rate limit reached: % per hour for %', ceiling, tg_table_name
      using errcode = '54000';
  end if;

  return new;
end $$;

-- Ceilings are set well above what a person logging real promises will hit and
-- well below what makes flooding worthwhile. A volunteer at a protest might
-- log a dozen commitments in an hour; nobody legitimately files two hundred.

drop trigger if exists submissions_rate on submissions;
create trigger submissions_rate before insert on submissions
  for each row execute function enforce_intake_rate('20', 'created_at');

drop trigger if exists proofs_rate on proofs;
create trigger proofs_rate before insert on proofs
  for each row execute function enforce_intake_rate('30', 'submitted_at');

drop trigger if exists complaints_rate on complaints;
create trigger complaints_rate before insert on complaints
  for each row execute function enforce_intake_rate('15', 'filed_at');

drop trigger if exists receipts_rate on receipts;
create trigger receipts_rate before insert on receipts
  for each row execute function enforce_intake_rate('30', 'created_at');

-- The indexes these counts run against. Without them the trigger degrades into
-- a sequential scan on every insert, which turns the rate limiter itself into
-- the denial of service it exists to prevent.
create index if not exists submissions_rate_idx on submissions (user_id, created_at desc);
create index if not exists proofs_rate_idx      on proofs (user_id, submitted_at desc);
create index if not exists complaints_rate_idx  on complaints (user_id, filed_at desc);
create index if not exists receipts_rate_idx    on receipts (user_id, created_at desc);

-- ------------------------------------------------------- storage volume ----
--
-- The bucket already caps each file at 5MB and refuses anything that is not an
-- image or a PDF, and it requires a session. None of that limits how MANY
-- files one identity may push. At 20 submissions an hour carrying 12 media
-- URLs each, a single identity could put 240 objects an hour into a bucket on
-- a plan whose free tier is one gigabyte — which exhausts storage, and on a
-- metered plan becomes a bill rather than an outage.
--
-- 60 an hour is far more than a person documenting a school will ever attach
-- and far less than makes filling the bucket practical.

create or replace function enforce_storage_rate() returns trigger
language plpgsql
security definer
set search_path = storage, public
as $$
declare
  recent int;
begin
  if new.bucket_id <> 'proof-media' then
    return new;
  end if;

  select count(*) into recent
    from storage.objects
   where bucket_id = 'proof-media'
     and owner is not distinct from new.owner
     and created_at > now() - interval '1 hour';

  if recent >= 60 then
    raise exception 'Rate limit reached: 60 uploads per hour'
      using errcode = '54000';
  end if;

  return new;
end $$;

drop trigger if exists proof_media_rate on storage.objects;
create trigger proof_media_rate before insert on storage.objects
  for each row execute function enforce_storage_rate();

create index if not exists proof_media_owner_idx
  on storage.objects (owner, created_at desc)
  where bucket_id = 'proof-media';
