-- Version 2.8 — Closed Beta Operation
-- Migration: 20260724280000_closed_beta_operation_v28
-- Tables: feature_requests / bug_reports / weekly_reports / beta_metrics / product_backlog

-- ============================================================
-- feature_requests
-- ============================================================
create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'other',
  priority text not null default 'medium',
  vote_count integer not null default 0,
  status text not null default 'open',
  planned_for text,
  submitted_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_requests_title_not_blank check (length(trim(title)) > 0),
  constraint feature_requests_category_check
    check (category in ('ux', 'analysis', 'ai', 'report', 'journey', 'homework', 'other')),
  constraint feature_requests_priority_check
    check (priority in ('critical', 'high', 'medium', 'low')),
  constraint feature_requests_status_check
    check (status in ('open', 'planned', 'in_progress', 'completed', 'deferred')),
  constraint feature_requests_vote_count_check check (vote_count >= 0)
);

create index if not exists feature_requests_vote_idx
  on public.feature_requests (vote_count desc, created_at desc);

create index if not exists feature_requests_status_idx
  on public.feature_requests (status, priority);

comment on table public.feature_requests is
  'Closed Beta Operation — 認定講師からの機能要望';

drop trigger if exists feature_requests_set_updated_at on public.feature_requests;
create trigger feature_requests_set_updated_at
before update on public.feature_requests
for each row execute function public.set_updated_at();

alter table public.feature_requests enable row level security;

drop policy if exists feature_requests_admin_all on public.feature_requests;
create policy feature_requests_admin_all
  on public.feature_requests for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

-- ============================================================
-- bug_reports
-- ============================================================
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  severity text not null default 'medium',
  status text not null default 'open',
  reporter_name text not null default '',
  affected_screen text not null default '',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bug_reports_title_not_blank check (length(trim(title)) > 0),
  constraint bug_reports_severity_check
    check (severity in ('critical', 'high', 'medium', 'low')),
  constraint bug_reports_status_check
    check (status in ('open', 'investigating', 'fixing', 'resolved', 'wontfix'))
);

create index if not exists bug_reports_severity_idx
  on public.bug_reports (severity, status, created_at desc);

comment on table public.bug_reports is
  'Closed Beta Operation — 不具合トラッカー';

drop trigger if exists bug_reports_set_updated_at on public.bug_reports;
create trigger bug_reports_set_updated_at
before update on public.bug_reports
for each row execute function public.set_updated_at();

alter table public.bug_reports enable row level security;

drop policy if exists bug_reports_admin_all on public.bug_reports;
create policy bug_reports_admin_all
  on public.bug_reports for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

-- ============================================================
-- weekly_reports
-- ============================================================
create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_label text not null,
  week_start date not null,
  week_end date not null,
  achievements jsonb not null default '[]'::jsonb,
  challenges jsonb not null default '[]'::jsonb,
  improvement_proposals jsonb not null default '[]'::jsonb,
  is_mock boolean not null default true,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_reports_label_not_blank check (length(trim(week_label)) > 0),
  constraint weekly_reports_range_check check (week_end >= week_start)
);

create index if not exists weekly_reports_week_idx
  on public.weekly_reports (week_start desc);

comment on table public.weekly_reports is
  'Closed Beta Operation — 週次 Closed Beta Report（当面モック自動生成）';

drop trigger if exists weekly_reports_set_updated_at on public.weekly_reports;
create trigger weekly_reports_set_updated_at
before update on public.weekly_reports
for each row execute function public.set_updated_at();

alter table public.weekly_reports enable row level security;

drop policy if exists weekly_reports_admin_all on public.weekly_reports;
create policy weekly_reports_admin_all
  on public.weekly_reports for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

-- ============================================================
-- beta_metrics
-- ============================================================
create table if not exists public.beta_metrics (
  id uuid primary key default gen_random_uuid(),
  period_label text not null default '今週（週次集計）',
  active_certified_instructors integer not null default 0,
  active_clients integer not null default 0,
  weekly_analysis_count integer not null default 0,
  average_continuation_rate integer not null default 0,
  average_improvement_rate integer not null default 0,
  feedback_response_rate integer not null default 0,
  weekly_new_registrations integer not null default 0,
  weekly_series jsonb not null default '[]'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_metrics_rates_check
    check (
      average_continuation_rate between 0 and 100
      and average_improvement_rate between 0 and 100
      and feedback_response_rate between 0 and 100
    )
);

create index if not exists beta_metrics_captured_idx
  on public.beta_metrics (captured_at desc);

comment on table public.beta_metrics is
  'Closed Beta Operation — Beta KPI スナップショット';

drop trigger if exists beta_metrics_set_updated_at on public.beta_metrics;
create trigger beta_metrics_set_updated_at
before update on public.beta_metrics
for each row execute function public.set_updated_at();

alter table public.beta_metrics enable row level security;

drop policy if exists beta_metrics_admin_all on public.beta_metrics;
create policy beta_metrics_admin_all
  on public.beta_metrics for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

-- ============================================================
-- product_backlog
-- ============================================================
create table if not exists public.product_backlog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  status text not null default 'todo',
  priority text not null default 'medium',
  module text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_backlog_title_not_blank check (length(trim(title)) > 0),
  constraint product_backlog_status_check
    check (status in ('todo', 'in_progress', 'done', 'on_hold')),
  constraint product_backlog_priority_check
    check (priority in ('critical', 'high', 'medium', 'low'))
);

create index if not exists product_backlog_status_idx
  on public.product_backlog (status, sort_order);

comment on table public.product_backlog is
  'Closed Beta Operation — 改善項目（Product Backlog）';

drop trigger if exists product_backlog_set_updated_at on public.product_backlog;
create trigger product_backlog_set_updated_at
before update on public.product_backlog
for each row execute function public.set_updated_at();

alter table public.product_backlog enable row level security;

drop policy if exists product_backlog_admin_all on public.product_backlog;
create policy product_backlog_admin_all
  on public.product_backlog for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

-- ============================================================
-- Seed（デモ用初期データ）
-- ============================================================
insert into public.beta_metrics (
  period_label,
  active_certified_instructors,
  active_clients,
  weekly_analysis_count,
  average_continuation_rate,
  average_improvement_rate,
  feedback_response_rate,
  weekly_new_registrations,
  weekly_series,
  captured_at
)
select
  '今週（週次集計）',
  14,
  52,
  118,
  84,
  67,
  91,
  9,
  '[
    {"weekLabel":"6/29週","analyses":72,"newClients":5,"activeInstructors":10},
    {"weekLabel":"7/6週","analyses":88,"newClients":7,"activeInstructors":11},
    {"weekLabel":"7/13週","analyses":101,"newClients":8,"activeInstructors":13},
    {"weekLabel":"7/20週","analyses":118,"newClients":9,"activeInstructors":14}
  ]'::jsonb,
  now()
where not exists (select 1 from public.beta_metrics limit 1);

insert into public.weekly_reports (
  week_label,
  week_start,
  week_end,
  achievements,
  challenges,
  improvement_proposals,
  is_mock,
  generated_at
)
select
  '2026年第30週',
  '2026-07-20'::date,
  '2026-07-26'::date,
  '["アクティブ認定講師が 14 名に到達","週間分析件数 118 件 · フィードバック対応率 91%"]'::jsonb,
  '["招待コード受諾の Critical 不具合が未解決","分析確認画面の入力消失が修正中"]'::jsonb,
  '["招待フローの回帰テストを週次ゲートに追加","分析セッション復元の優先度を上げる"]'::jsonb,
  true,
  now()
where not exists (select 1 from public.weekly_reports limit 1);
