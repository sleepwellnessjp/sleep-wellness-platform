-- Version 2.9 — Closed Beta Evidence Collection
-- Migration: 20260724290000_closed_beta_evidence_v29
-- Tables: evidence_session_surveys / evidence_morning_surveys
-- 個人特定不可の匿名キーのみ保持。本部は集計のみ利用。

-- ============================================================
-- evidence_session_surveys（認定講師 · カウンセリング終了時）
-- ============================================================
create table if not exists public.evidence_session_surveys (
  id uuid primary key default gen_random_uuid(),
  anonymous_key text not null,
  analysis_id text,
  client_anonymous_key text,
  satisfaction integer not null,
  understanding integer not null,
  homework_likelihood integer not null,
  next_appointment text not null default 'undecided',
  free_comment text not null default '',
  app_version text not null default '',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint evidence_session_satisfaction_check
    check (satisfaction between 1 and 5),
  constraint evidence_session_understanding_check
    check (understanding between 1 and 5),
  constraint evidence_session_homework_check
    check (homework_likelihood between 1 and 5),
  constraint evidence_session_next_appointment_check
    check (next_appointment in ('yes', 'no', 'undecided'))
);

create index if not exists evidence_session_submitted_idx
  on public.evidence_session_surveys (submitted_at desc);

create index if not exists evidence_session_anon_idx
  on public.evidence_session_surveys (anonymous_key, submitted_at desc);

comment on table public.evidence_session_surveys is
  'Closed Beta Evidence — カウンセリング終了時 30秒アンケート（匿名）';

alter table public.evidence_session_surveys enable row level security;

drop policy if exists evidence_session_insert_authenticated
  on public.evidence_session_surveys;
create policy evidence_session_insert_authenticated
  on public.evidence_session_surveys for insert
  to authenticated
  with check (true);

drop policy if exists evidence_session_select_admin
  on public.evidence_session_surveys;
create policy evidence_session_select_admin
  on public.evidence_session_surveys for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

-- ============================================================
-- evidence_morning_surveys（クライアント · 翌朝）
-- ============================================================
create table if not exists public.evidence_morning_surveys (
  id uuid primary key default gen_random_uuid(),
  anonymous_key text not null,
  survey_date date not null,
  sleep_satisfaction integer not null,
  morning_mood integer not null,
  daytime_condition integer not null,
  free_comment text not null default '',
  app_version text not null default '',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint evidence_morning_sleep_check
    check (sleep_satisfaction between 1 and 5),
  constraint evidence_morning_mood_check
    check (morning_mood between 1 and 5),
  constraint evidence_morning_daytime_check
    check (daytime_condition between 1 and 5),
  constraint evidence_morning_anon_date_unique
    unique (anonymous_key, survey_date)
);

create index if not exists evidence_morning_submitted_idx
  on public.evidence_morning_surveys (submitted_at desc);

create index if not exists evidence_morning_date_idx
  on public.evidence_morning_surveys (survey_date desc);

comment on table public.evidence_morning_surveys is
  'Closed Beta Evidence — 翌朝アンケート（匿名）';

alter table public.evidence_morning_surveys enable row level security;

drop policy if exists evidence_morning_insert_authenticated
  on public.evidence_morning_surveys;
create policy evidence_morning_insert_authenticated
  on public.evidence_morning_surveys for insert
  to authenticated
  with check (true);

drop policy if exists evidence_morning_update_own_anon
  on public.evidence_morning_surveys;
-- 更新はサービス層の upsert 用。クライアントは自分の匿名キー行のみ更新可にできないため、
-- authenticated の update は許可し、キーはアプリ側でハッシュ生成する。
create policy evidence_morning_update_authenticated
  on public.evidence_morning_surveys for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists evidence_morning_select_own_or_admin
  on public.evidence_morning_surveys;
create policy evidence_morning_select_authenticated
  on public.evidence_morning_surveys for select
  to authenticated
  using (true);

-- 注: select は匿名キーのみのため個人特定は困難。本番硬化時は
-- 本部ロール限定 + 本人キー照合 RPC へ切り替えること。
