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

create index if not exists commitments_state_idx    on commitments (state_slug);
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

alter table commitments enable row level security;
alter table proofs      enable row level security;
alter table complaints  enable row level security;
alter table submissions enable row level security;

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
