-- Version 2.4 — Closed Beta 運営モード
-- Migration: 20260724240000_closed_beta_ops_v24
-- Tables: beta_feedback (extend) / release_notes / usage_statistics / system_health / roadmap_items

-- ============================================================
-- beta_feedback 拡張（使いやすさ評価 · 優先順位）
-- ============================================================
alter table public.beta_feedback
  add column if not exists usability_rating integer;

alter table public.beta_feedback
  add column if not exists priority text not null default 'p2';

alter table public.beta_feedback
  drop constraint if exists beta_feedback_usability_rating_check;

alter table public.beta_feedback
  add constraint beta_feedback_usability_rating_check
  check (
    usability_rating is null
    or (usability_rating >= 1 and usability_rating <= 5)
  );

alter table public.beta_feedback
  drop constraint if exists beta_feedback_priority_check;

alter table public.beta_feedback
  add constraint beta_feedback_priority_check
  check (priority in ('p0', 'p1', 'p2', 'p3'));

create index if not exists beta_feedback_priority_idx
  on public.beta_feedback (priority, created_at desc);

create index if not exists beta_feedback_usability_idx
  on public.beta_feedback (usability_rating);

comment on column public.beta_feedback.usability_rating is
  '使いやすさ評価（1〜5）。任意。';
comment on column public.beta_feedback.priority is
  '本部が設定する対応優先順位（P0〜P3）。';

-- ============================================================
-- release_notes
-- ============================================================
create table if not exists public.release_notes (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  released_at date not null,
  title text not null,
  changes jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  is_current boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint release_notes_version_not_blank check (length(trim(version)) > 0),
  constraint release_notes_title_not_blank check (length(trim(title)) > 0)
);

create unique index if not exists release_notes_version_uidx
  on public.release_notes (version);

create index if not exists release_notes_sort_idx
  on public.release_notes (sort_order desc);

comment on table public.release_notes is
  'Closed Beta / 製品アップデート履歴';

drop trigger if exists release_notes_set_updated_at on public.release_notes;
create trigger release_notes_set_updated_at
before update on public.release_notes
for each row execute function public.set_updated_at();

alter table public.release_notes enable row level security;

drop policy if exists release_notes_select_authenticated on public.release_notes;
create policy release_notes_select_authenticated
  on public.release_notes for select
  to authenticated
  using (true);

drop policy if exists release_notes_admin_write on public.release_notes;
create policy release_notes_admin_write
  on public.release_notes for all
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
-- usage_statistics（モック運用データ）
-- ============================================================
create table if not exists public.usage_statistics (
  id uuid primary key default gen_random_uuid(),
  period_label text not null default '直近 14 日',
  average_session_minutes numeric(6, 1) not null default 0,
  mobile_share_percent integer not null default 0,
  pc_share_percent integer not null default 0,
  tablet_share_percent integer not null default 0,
  top_screens jsonb not null default '[]'::jsonb,
  drop_off_points jsonb not null default '[]'::jsonb,
  is_mock boolean not null default true,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_statistics_shares_check
    check (
      mobile_share_percent >= 0
      and pc_share_percent >= 0
      and tablet_share_percent >= 0
      and mobile_share_percent + pc_share_percent + tablet_share_percent <= 100
    )
);

create index if not exists usage_statistics_captured_idx
  on public.usage_statistics (captured_at desc);

comment on table public.usage_statistics is
  'Closed Beta Usage Analytics（当面モック）';

drop trigger if exists usage_statistics_set_updated_at on public.usage_statistics;
create trigger usage_statistics_set_updated_at
before update on public.usage_statistics
for each row execute function public.set_updated_at();

alter table public.usage_statistics enable row level security;

drop policy if exists usage_statistics_select_admin on public.usage_statistics;
create policy usage_statistics_select_admin
  on public.usage_statistics for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

drop policy if exists usage_statistics_admin_write on public.usage_statistics;
create policy usage_statistics_admin_write
  on public.usage_statistics for all
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
-- system_health
-- ============================================================
create table if not exists public.system_health (
  id uuid primary key default gen_random_uuid(),
  component_id text not null,
  label text not null,
  status text not null default 'operational',
  detail text not null default '',
  latency_ms integer,
  sort_order integer not null default 0,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_health_component_uidx unique (component_id),
  constraint system_health_status_check
    check (status in ('operational', 'degraded', 'outage', 'maintenance'))
);

create index if not exists system_health_sort_idx
  on public.system_health (sort_order asc);

comment on table public.system_health is
  'Closed Beta Health Score（サーバーはモック可）';

drop trigger if exists system_health_set_updated_at on public.system_health;
create trigger system_health_set_updated_at
before update on public.system_health
for each row execute function public.set_updated_at();

alter table public.system_health enable row level security;

drop policy if exists system_health_select_admin on public.system_health;
create policy system_health_select_admin
  on public.system_health for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

drop policy if exists system_health_admin_write on public.system_health;
create policy system_health_admin_write
  on public.system_health for all
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
-- roadmap_items
-- ============================================================
create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  horizon text not null,
  version_label text not null,
  title text not null,
  summary text not null default '',
  status text not null default 'planned',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roadmap_items_horizon_check
    check (horizon in ('v2_5', 'v3_0', 'coming_soon')),
  constraint roadmap_items_status_check
    check (status in ('planned', 'in_progress', 'shipped', 'deferred')),
  constraint roadmap_items_title_not_blank check (length(trim(title)) > 0)
);

create index if not exists roadmap_items_horizon_sort_idx
  on public.roadmap_items (horizon, sort_order);

comment on table public.roadmap_items is
  'Closed Beta Roadmap（Version 2.5 / 3.0 / Coming Soon）';

drop trigger if exists roadmap_items_set_updated_at on public.roadmap_items;
create trigger roadmap_items_set_updated_at
before update on public.roadmap_items
for each row execute function public.set_updated_at();

alter table public.roadmap_items enable row level security;

drop policy if exists roadmap_items_select_authenticated on public.roadmap_items;
create policy roadmap_items_select_authenticated
  on public.roadmap_items for select
  to authenticated
  using (true);

drop policy if exists roadmap_items_admin_write on public.roadmap_items;
create policy roadmap_items_admin_write
  on public.roadmap_items for all
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
-- Seed data
-- ============================================================
insert into public.release_notes (
  version, released_at, title, changes, improvements, is_current, sort_order
)
values
  (
    '2.4.0',
    '2026-07-24',
    'Closed Beta 運営モード',
    '["SWIJ本部向け Beta Dashboard を追加","Health Score · Usage Analytics · Roadmap を追加","Release Notes を追加"]'::jsonb,
    '["認定講師フィードバックに使いやすさ評価と優先順位を追加","第1期・第2期認定講師限定の正式運用コンソールを整備"]'::jsonb,
    true,
    240
  ),
  (
    '2.3.0',
    '2026-07-24',
    'UI/UX ブラッシュアップ',
    '["画面遷移・ローディング・Skeleton を刷新","カード / ボタン / 余白を SWIJ ブランドに統一"]'::jsonb,
    '["スマホ・タブレットの操作性を向上","アクセシビリティを強化"]'::jsonb,
    false,
    230
  ),
  (
    '2.2.0',
    '2026-07-24',
    'ライセンス・課金・権限',
    '["RBAC · ライセンス · サブスク · 招待 · 監査ログ","認定校ホームを追加"]'::jsonb,
    '["正式運用に向けた権限・課金基盤を整備"]'::jsonb,
    false,
    220
  )
on conflict (version) do update set
  released_at = excluded.released_at,
  title = excluded.title,
  changes = excluded.changes,
  improvements = excluded.improvements,
  is_current = excluded.is_current,
  sort_order = excluded.sort_order;

insert into public.system_health (
  component_id, label, status, detail, latency_ms, sort_order
)
values
  ('server', 'サーバー状態', 'operational', 'Edge / App Router 応答正常（モック）', 48, 10),
  ('database', 'DB接続', 'operational', 'Supabase Postgres 接続プール健全', 22, 20),
  ('ai', 'AI稼働', 'operational', 'Sleep Coach / Instructor Assistant 待機中', 310, 30),
  ('api', 'API状態', 'operational', '公開 API · 管理 API ともに 2xx 中心', 36, 40),
  ('utilization', '利用率', 'operational', 'Closed Beta 想定キャパシティの 42%', null, 50)
on conflict (component_id) do update set
  label = excluded.label,
  status = excluded.status,
  detail = excluded.detail,
  latency_ms = excluded.latency_ms,
  sort_order = excluded.sort_order,
  checked_at = now();

insert into public.usage_statistics (
  period_label,
  average_session_minutes,
  mobile_share_percent,
  pc_share_percent,
  tablet_share_percent,
  top_screens,
  drop_off_points,
  is_mock
)
select
  '直近 14 日（モック）',
  11.4,
  58,
  36,
  6,
  '[
    {"screen":"dashboard","label":"Dashboard","sessions":1840,"sharePercent":22},
    {"screen":"clients","label":"Clients","sessions":1620,"sharePercent":19},
    {"screen":"analysis","label":"Analysis","sessions":1480,"sharePercent":18},
    {"screen":"journey","label":"Journey","sessions":980,"sharePercent":12},
    {"screen":"homework","label":"Homework","sessions":860,"sharePercent":10},
    {"screen":"reports","label":"Report","sessions":720,"sharePercent":9}
  ]'::jsonb,
  '[
    {"screen":"analysis/confirm","label":"分析確認","dropOffPercent":18},
    {"screen":"clients/new","label":"クライアント新規登録","dropOffPercent":14},
    {"screen":"homework","label":"Homework 完了確認","dropOffPercent":11}
  ]'::jsonb,
  true
where not exists (select 1 from public.usage_statistics limit 1);

insert into public.roadmap_items (
  id, horizon, version_label, title, summary, status, sort_order
)
values
  (
    'aaaaaaaa-bbbb-cccc-ddd1-000000000001',
    'v2_5',
    'Version 2.5',
    '運用フィードバック反映',
    'Closed Beta の改善要望・不具合を優先度順に反映し、安定運用を強化します。',
    'planned',
    10
  ),
  (
    'aaaaaaaa-bbbb-cccc-ddd1-000000000002',
    'v2_5',
    'Version 2.5',
    '通知・リマインド精度向上',
    '認定更新・Homework・フォロー予定の通知タイミングを最適化します。',
    'planned',
    20
  ),
  (
    'aaaaaaaa-bbbb-cccc-ddd1-000000000003',
    'v3_0',
    'Version 3.0',
    'Academy / Community 本番運用',
    '教材配信・コミュニティ・イベントを本番トラフィック向けに拡張します。',
    'planned',
    10
  ),
  (
    'aaaaaaaa-bbbb-cccc-ddd1-000000000004',
    'v3_0',
    'Version 3.0',
    'Enterprise & Developer API',
    '企業向けダッシュボードと外部連携 API を正式公開します。',
    'planned',
    20
  ),
  (
    'aaaaaaaa-bbbb-cccc-ddd1-000000000005',
    'coming_soon',
    'Coming Soon',
    'ウェアラブル連携強化',
    'SOXAI 以外のデバイス連携とリアルタイム同期を検討中です。',
    'deferred',
    10
  ),
  (
    'aaaaaaaa-bbbb-cccc-ddd1-000000000006',
    'coming_soon',
    'Coming Soon',
    '多言語対応',
    '英語 UI と海外認定校向けローカライズを準備します。',
    'deferred',
    20
  )
on conflict (id) do update set
  horizon = excluded.horizon,
  version_label = excluded.version_label,
  title = excluded.title,
  summary = excluded.summary,
  status = excluded.status,
  sort_order = excluded.sort_order;
