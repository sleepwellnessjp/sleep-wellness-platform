-- ============================================================
-- Version 1.0 Beta — 認定講師向けデータ連携テーブル
-- Migration: 20260723100000_v1_beta_data_tables
--
-- 既存の clients / analyses / client_homeworks は維持し、
-- Beta UI 契約に合わせた列・テーブルを追加する（破壊的変更なし）。
-- ============================================================


-- ------------------------------------------------------------
-- 0. 担当判定ヘルパー（instructor_id / owner_id 両対応）
-- ------------------------------------------------------------
create or replace function public.beta_owns_client(p_client_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Prefer instructor_id when present; otherwise owner_id.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'instructor_id'
  ) then
    return exists (
      select 1 from public.clients c
      where c.id = p_client_id and c.instructor_id = auth.uid()
    );
  end if;

  return exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.owner_id = auth.uid()
  );
end;
$$;

revoke all on function public.beta_owns_client(uuid) from public;
grant execute on function public.beta_owns_client(uuid) to authenticated;

-- ------------------------------------------------------------
-- 1. clients — Beta 必要列を追加（既存データは保持）
-- ------------------------------------------------------------
alter table public.clients
  add column if not exists age integer
    check (age is null or (age >= 0 and age <= 130));

alter table public.clients
  add column if not exists start_date date;

alter table public.clients
  add column if not exists next_follow_up_date date;

alter table public.clients
  add column if not exists current_sleep_score integer
    check (
      current_sleep_score is null
      or (current_sleep_score >= 0 and current_sleep_score <= 100)
    );

-- 既存行の start_date を埋める（registered_at → created_at）
update public.clients
set start_date = coalesce(
  start_date,
  registered_at,
  (created_at at time zone 'Asia/Tokyo')::date
)
where start_date is null;

-- 最新 analyses から current_sleep_score を初期化（未設定のみ）
update public.clients c
set current_sleep_score = sub.sleep_score
from (
  select distinct on (a.client_id)
    a.client_id,
    a.sleep_score
  from public.analyses a
  where a.sleep_score is not null
  order by a.client_id, a.analyzed_at desc nulls last, a.created_at desc
) sub
where c.id = sub.client_id
  and c.current_sleep_score is null;

comment on column public.clients.start_date is
  '改善・指導開始日（Version 1.0 Beta）';
comment on column public.clients.next_follow_up_date is
  '次回フォロー予定日（Version 1.0 Beta）';
comment on column public.clients.current_sleep_score is
  '直近の Sleep Score（Version 1.0 Beta 一覧・詳細用）';

-- ------------------------------------------------------------
-- 2. sleep_analyses — 睡眠分析入力 + AI 結果（JSONB）
-- ------------------------------------------------------------
create table if not exists public.sleep_analyses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid not null
    references auth.users (id) on delete cascade,
  analysis_date date not null
    default (timezone('Asia/Tokyo', now()))::date,
  sleep_data jsonb not null default '{}'::jsonb,
  lifestyle_data jsonb not null default '{}'::jsonb,
  analysis_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sleep_analyses_instructor_idx
  on public.sleep_analyses (instructor_id, analysis_date desc);

create index if not exists sleep_analyses_client_idx
  on public.sleep_analyses (client_id, analysis_date desc);

comment on table public.sleep_analyses is
  'Version 1.0 Beta: 睡眠分析入力と AI 分析結果（JSONB）';
comment on column public.sleep_analyses.sleep_data is
  'SOXAI / 確認済み睡眠指標 JSON';
comment on column public.sleep_analyses.lifestyle_data is
  '生活習慣入力 JSON';
comment on column public.sleep_analyses.analysis_result is
  'AI Sleep Analysis Engine 出力 JSON';

drop trigger if exists sleep_analyses_set_updated_at on public.sleep_analyses;
create trigger sleep_analyses_set_updated_at
before update on public.sleep_analyses
for each row execute function public.set_updated_at();

alter table public.sleep_analyses enable row level security;

drop policy if exists "sleep_analyses_select_own" on public.sleep_analyses;
create policy "sleep_analyses_select_own"
  on public.sleep_analyses for select
  using (auth.uid() = instructor_id);

drop policy if exists "sleep_analyses_insert_own" on public.sleep_analyses;
create policy "sleep_analyses_insert_own"
  on public.sleep_analyses for insert
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "sleep_analyses_update_own" on public.sleep_analyses;
create policy "sleep_analyses_update_own"
  on public.sleep_analyses for update
  using (auth.uid() = instructor_id)
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "sleep_analyses_delete_own" on public.sleep_analyses;
create policy "sleep_analyses_delete_own"
  on public.sleep_analyses for delete
  using (auth.uid() = instructor_id);

-- ------------------------------------------------------------
-- 3. sleep_journeys — 改善経過レコード
-- ------------------------------------------------------------
create table if not exists public.sleep_journeys (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid not null
    references auth.users (id) on delete cascade,
  recorded_at date not null
    default (timezone('Asia/Tokyo', now()))::date,
  sleep_score integer
    check (sleep_score is null or (sleep_score >= 0 and sleep_score <= 100)),
  hrv numeric,
  stress numeric,
  achievement_rate integer
    check (
      achievement_rate is null
      or (achievement_rate >= 0 and achievement_rate <= 100)
    ),
  instructor_comment text not null default '',
  next_goal jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sleep_journeys_client_idx
  on public.sleep_journeys (client_id, recorded_at desc);

create index if not exists sleep_journeys_instructor_idx
  on public.sleep_journeys (instructor_id, recorded_at desc);

comment on table public.sleep_journeys is
  'Version 1.0 Beta: Sleep Journey 改善経過';
comment on column public.sleep_journeys.next_goal is
  '次回目標 JSON（sleepScore / hrv / stress 等）';

alter table public.sleep_journeys enable row level security;

drop policy if exists "sleep_journeys_select_own" on public.sleep_journeys;
create policy "sleep_journeys_select_own"
  on public.sleep_journeys for select
  using (auth.uid() = instructor_id);

drop policy if exists "sleep_journeys_insert_own" on public.sleep_journeys;
create policy "sleep_journeys_insert_own"
  on public.sleep_journeys for insert
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "sleep_journeys_update_own" on public.sleep_journeys;
create policy "sleep_journeys_update_own"
  on public.sleep_journeys for update
  using (auth.uid() = instructor_id)
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "sleep_journeys_delete_own" on public.sleep_journeys;
create policy "sleep_journeys_delete_own"
  on public.sleep_journeys for delete
  using (auth.uid() = instructor_id);

-- ------------------------------------------------------------
-- 4. homework — Beta UI 向け課題（client_homeworks と並存）
-- ------------------------------------------------------------
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid not null
    references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  start_date date not null
    default (timezone('Asia/Tokyo', now()))::date,
  due_date date not null,
  frequency text not null default 'daily'
    check (frequency in ('daily', 'weekdays', 'weekly', 'as_needed')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  status text not null default 'not_started'
    check (status in ('completed', 'active', 'not_started', 'overdue')),
  progress integer not null default 0
    check (progress >= 0 and progress <= 100),
  client_message text not null default '',
  instructor_comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homework_title_not_blank check (btrim(title) <> ''),
  constraint homework_due_gte_start check (due_date >= start_date)
);

create index if not exists homework_client_idx
  on public.homework (client_id, due_date desc, start_date desc);

create index if not exists homework_instructor_idx
  on public.homework (instructor_id, updated_at desc);

comment on table public.homework is
  'Version 1.0 Beta: Homework / Follow-up 画面の課題。client_homeworks と並存。';

drop trigger if exists homework_set_updated_at on public.homework;
create trigger homework_set_updated_at
before update on public.homework
for each row execute function public.set_updated_at();

alter table public.homework enable row level security;

drop policy if exists "homework_select_own" on public.homework;
create policy "homework_select_own"
  on public.homework for select
  using (auth.uid() = instructor_id);

drop policy if exists "homework_insert_own" on public.homework;
create policy "homework_insert_own"
  on public.homework for insert
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "homework_update_own" on public.homework;
create policy "homework_update_own"
  on public.homework for update
  using (auth.uid() = instructor_id)
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "homework_delete_own" on public.homework;
create policy "homework_delete_own"
  on public.homework for delete
  using (auth.uid() = instructor_id);

-- ------------------------------------------------------------
-- 5. follow_up_records — フォロー記録
-- ------------------------------------------------------------
create table if not exists public.follow_up_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid not null
    references auth.users (id) on delete cascade,
  follow_up_date date not null
    default (timezone('Asia/Tokyo', now()))::date,
  method text not null default 'online'
    check (method in ('in_person', 'online', 'phone', 'message')),
  sleep_score integer
    check (sleep_score is null or (sleep_score >= 0 and sleep_score <= 100)),
  client_changes text not null default '',
  instructor_notes text not null default '',
  next_action text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists follow_up_records_client_idx
  on public.follow_up_records (client_id, follow_up_date desc);

create index if not exists follow_up_records_instructor_idx
  on public.follow_up_records (instructor_id, follow_up_date desc);

comment on table public.follow_up_records is
  'Version 1.0 Beta: フォローアップ記録';

alter table public.follow_up_records enable row level security;

drop policy if exists "follow_up_records_select_own" on public.follow_up_records;
create policy "follow_up_records_select_own"
  on public.follow_up_records for select
  using (auth.uid() = instructor_id);

drop policy if exists "follow_up_records_insert_own" on public.follow_up_records;
create policy "follow_up_records_insert_own"
  on public.follow_up_records for insert
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "follow_up_records_update_own" on public.follow_up_records;
create policy "follow_up_records_update_own"
  on public.follow_up_records for update
  using (auth.uid() = instructor_id)
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "follow_up_records_delete_own" on public.follow_up_records;
create policy "follow_up_records_delete_own"
  on public.follow_up_records for delete
  using (auth.uid() = instructor_id);

-- ------------------------------------------------------------
-- 6. reports — Sleep Wellness Report
-- ------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid not null
    references auth.users (id) on delete cascade,
  analysis_id uuid
    references public.sleep_analyses (id) on delete set null,
  report_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_instructor_idx
  on public.reports (instructor_id, created_at desc);

create index if not exists reports_client_idx
  on public.reports (client_id, created_at desc);

create index if not exists reports_analysis_idx
  on public.reports (analysis_id);

comment on table public.reports is
  'Version 1.0 Beta: Sleep Wellness Report 永続化';
comment on column public.reports.report_data is
  'レポート表示用 JSON（タイトル・スコア・AI 抜粋等）';

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports for select
  using (auth.uid() = instructor_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own"
  on public.reports for update
  using (auth.uid() = instructor_id)
  with check (
    auth.uid() = instructor_id
    and public.beta_owns_client(client_id)
  );

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
  on public.reports for delete
  using (auth.uid() = instructor_id);

-- ------------------------------------------------------------
-- 7. Grants（authenticated）
-- ------------------------------------------------------------
grant select, insert, update, delete on public.sleep_analyses to authenticated;
grant select, insert, update, delete on public.sleep_journeys to authenticated;
grant select, insert, update, delete on public.homework to authenticated;
grant select, insert, update, delete on public.follow_up_records to authenticated;
grant select, insert, update, delete on public.reports to authenticated;
