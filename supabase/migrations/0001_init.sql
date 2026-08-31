-- UOB Booth NPC Lead Recommender — schema (spec §10)
--
-- Three tables. Two invariants worth stating before the DDL:
--
--   `leads` is APPEND-ONLY. Two taps by one person are two rows. Dedupe is
--   a read-time rule (highest final_score per lowercased email), not an
--   upsert — an upsert would let a casual second pass destroy a richer
--   first conversation.
--
--   `consent_versions` is INSERT-ONLY. Editing wording inserts a new
--   version row. An update would destroy the evidence retroactively, and
--   PDPA requires consent in evidential form.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- sessions — one row per tap. No personal data, ever.
--
-- Because it holds no personal data it is never deleted: footfall and the
-- funnel's shape survive the 90-day purge while every identifiable record
-- is destroyed on schedule.
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  session_id  uuid primary key,               -- client-minted on app open
  tapped_at   timestamptz not null default now(),
  engaged_at  timestamptz,                    -- set on reaching `interest`
  user_agent  text not null default '',
  source      text not null default 'nfc'
                check (source in ('nfc', 'tablet'))
);

create index if not exists sessions_tapped_at_idx on public.sessions (tapped_at);
create index if not exists sessions_engaged_at_idx on public.sessions (engaged_at);

-- ---------------------------------------------------------------------------
-- consent_versions — the evidential half of consent.
--
-- The lead stores version + timestamp + booleans; the exact wording lives
-- here once rather than on all 2,000 rows.
-- ---------------------------------------------------------------------------
create table if not exists public.consent_versions (
  version        text primary key,
  purpose_text   text not null,
  phone_text     text not null,
  notice_text    text not null,
  effective_from timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leads — one immutable row per completed session.
--
-- Score, band and BU are frozen at submission and never recomputed on read:
-- the visitor was shown a CTA chosen from that band, so a recompute would
-- make the record contradict what happened. The breakdown, the raw answers
-- and scoring_version are all stored, so a scoring bug is recomputable into
-- a NEW column without rewriting history.
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  -- Unique, which also makes the offline queue's retry idempotent: a
  -- payload delivered twice inserts once.
  session_id    uuid not null unique references public.sessions (session_id),
  submitted_at  timestamptz not null default now(),

  -- Contact. No address field: it feeds no scoring, no routing and no
  -- follow-up, so collecting it would fail purpose limitation.
  full_name     text not null,
  company_name  text not null,
  company_email text not null,
  role          text not null
                  check (role in ('owner_c_suite_director',
                                  'manager_finance',
                                  'executive_analyst_other')),
  phone         text,

  email_domain        text not null,
  is_corporate_domain boolean not null,

  -- Answers, as option ids. Strings rather than enums so options can change
  -- up to the event without a migration.
  --
  -- All four are nullable. The spec's prose says interest and need are not,
  -- on the grounds that reaching the CTA means passing through both — but
  -- the persistent exit is on EVERY node including `interest`, so a visitor
  -- can reach the CTA having answered nothing. A NOT NULL here would reject
  -- that lead outright, and capture is what must survive.
  interest  text,
  need      text,
  timeline  text,
  intent    text,

  -- Scoring, frozen.
  need_points       smallint not null,
  timeline_points   smallint not null,
  intent_points     smallint not null,
  influence_points  smallint not null,
  fit_points        smallint not null,
  provisional_score smallint not null,
  engagement_points smallint not null,
  final_score       smallint not null,
  band              text not null
                      check (band in ('HOT', 'WARM', 'QUALIFIED', 'EXPLORATORY')),
  scoring_version   text not null,

  cta_action        text not null
                      check (cta_action in ('bu_follow_up', 'send_info', 'explore')),
  cta_wording_shown text not null,

  -- BU ids, never labels: renaming a BU must not rewrite history.
  primary_bu   text not null,
  secondary_bu text,

  is_incomplete boolean not null default false,
  handled_at    timestamptz,
  handled_by    text,
  -- Set by Mark handled. This is data-protection machinery, not workflow
  -- convenience: it stops the 90-day job deleting a lead a BU is mid-pursuit
  -- on.
  retention_exempt boolean not null default false,

  consent_version       text not null references public.consent_versions (version),
  consent_purpose_given boolean not null,
  consent_phone_given   boolean not null default false,
  consent_at            timestamptz not null,

  -- Consent gates the write: a row that got here without the purpose tick
  -- should not exist.
  constraint leads_purpose_consent_required check (consent_purpose_given),
  -- A phone consent with no number is a consent to nothing.
  constraint leads_phone_consent_needs_phone
    check (not consent_phone_given or phone is not null),
  -- An incomplete session can never be Qualified (spec §8, §13).
  constraint leads_incomplete_is_exploratory
    check (not is_incomplete or band = 'EXPLORATORY')
);

create index if not exists leads_submitted_at_idx on public.leads (submitted_at desc);
create index if not exists leads_band_idx on public.leads (band);
create index if not exists leads_primary_bu_idx on public.leads (primary_bu);
create index if not exists leads_handled_at_idx on public.leads (handled_at);
-- The read-time dedupe key.
create index if not exists leads_email_lower_idx on public.leads (lower(company_email));

-- Append-only, enforced rather than promised. `handled_at`, `handled_by`
-- and `retention_exempt` are the only mutable columns: Mark handled must
-- work, and nothing else may.
create or replace function public.leads_forbid_rewrite()
returns trigger
language plpgsql
as $$
begin
  if (new.id, new.session_id, new.company_email, new.final_score, new.band,
      new.primary_bu, new.provisional_score, new.engagement_points,
      new.consent_version, new.scoring_version)
     is distinct from
     (old.id, old.session_id, old.company_email, old.final_score, old.band,
      old.primary_bu, old.provisional_score, old.engagement_points,
      old.consent_version, old.scoring_version)
  then
    raise exception
      'leads is append-only: score, band, BU and consent are frozen at submission';
  end if;
  return new;
end;
$$;

drop trigger if exists leads_forbid_rewrite on public.leads;
create trigger leads_forbid_rewrite
  before update on public.leads
  for each row execute function public.leads_forbid_rewrite();

-- consent_versions is insert-only.
create or replace function public.consent_versions_forbid_change()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'consent_versions is insert-only: new wording means a new version row';
end;
$$;

drop trigger if exists consent_versions_forbid_change on public.consent_versions;
create trigger consent_versions_forbid_change
  before update or delete on public.consent_versions
  for each row execute function public.consent_versions_forbid_change();

-- ---------------------------------------------------------------------------
-- RLS
--
-- Every read and write goes through a Next.js route holding the service
-- role key, which bypasses RLS. Enabling it with no policies means the anon
-- key — which ships to the visitor's phone — can reach neither table.
-- ---------------------------------------------------------------------------
alter table public.sessions enable row level security;
alter table public.leads enable row level security;
alter table public.consent_versions enable row level security;

-- ---------------------------------------------------------------------------
-- Retention — 90 days after the event, then hard delete (spec §7).
--
-- Scheduled, not remembered. The carve-out for a lead that has become an
-- active pursuit is `retention_exempt`, set by Mark handled.
--
-- This purges the TABLE only. Generated export packs in Supabase Storage
-- are copies of the same personal data and must be purged too — see
-- scripts/purge-expired.mjs. Deleting only the table keeps the promise in
-- letter and breaks it in substance.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_leads(retain_days integer default 90)
returns integer
language plpgsql
as $$
declare
  deleted integer;
begin
  delete from public.leads
   where submitted_at < now() - make_interval(days => retain_days)
     and not retention_exempt;
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;
