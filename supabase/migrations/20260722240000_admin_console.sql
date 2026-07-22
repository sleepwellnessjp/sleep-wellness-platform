-- Migration: 20260722240000_admin_console
-- SWIJ Management Console — settings, activity logs, admin RLS

-- ============================================================
-- platform_settings（システム設定・シングルトン）
-- ============================================================
create table if not exists public.platform_settings (
  id text primary key default 'default',
  brand_primary text not null default '#071426',
  brand_accent text not null default '#8a6a2d',
  logo_url text not null default '/swij-logo-horizontal.png',
  terms_of_service text not null default '',
  privacy_policy text not null default '',
  contact_email text not null default 'contact@sleepwellness.jp',
  contact_phone text not null default '',
  contact_note text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_settings_singleton check (id = 'default')
);

comment on table public.platform_settings is
  'SWIJ Management Console システム設定（ブランド・規約・問い合わせ）';

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;
create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();

insert into public.platform_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_select_admin"
  on public.platform_settings;
create policy "platform_settings_select_admin"
  on public.platform_settings for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "platform_settings_update_admin"
  on public.platform_settings;
create policy "platform_settings_update_admin"
  on public.platform_settings for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "platform_settings_insert_admin"
  on public.platform_settings;
create policy "platform_settings_insert_admin"
  on public.platform_settings for insert
  to authenticated
  with check (public.is_admin_or_above());

-- ============================================================
-- system_activity_logs（ログイン / 分析 / PDF / AI）
-- ============================================================
create table if not exists public.system_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  category text not null,
  action text not null,
  target_type text,
  target_id text,
  summary text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint system_activity_logs_category_check
    check (
      category in ('login', 'analysis', 'pdf', 'ai', 'admin', 'other')
    )
);

create index if not exists system_activity_logs_created_idx
  on public.system_activity_logs (created_at desc);

create index if not exists system_activity_logs_category_idx
  on public.system_activity_logs (category, created_at desc);

create index if not exists system_activity_logs_actor_idx
  on public.system_activity_logs (actor_id, created_at desc);

comment on table public.system_activity_logs is
  'SWIJ Management Console 活動ログ（ログイン・分析・PDF・AI）';

alter table public.system_activity_logs enable row level security;

drop policy if exists "system_activity_logs_select_admin"
  on public.system_activity_logs;
create policy "system_activity_logs_select_admin"
  on public.system_activity_logs for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "system_activity_logs_insert_authenticated"
  on public.system_activity_logs;
create policy "system_activity_logs_insert_authenticated"
  on public.system_activity_logs for insert
  to authenticated
  with check (
    actor_id is null
    or actor_id = auth.uid()
    or public.is_admin_or_above()
  );

-- ============================================================
-- profiles.last_login_at（最終ログイン）
-- ============================================================
alter table public.profiles
  add column if not exists last_login_at timestamptz;

-- ============================================================
-- Admin SELECT bypass（clients / analyses / programs / academy）
-- ============================================================
drop policy if exists "clients_select_admin" on public.clients;
create policy "clients_select_admin"
  on public.clients for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "analyses_select_admin" on public.analyses;
create policy "analyses_select_admin"
  on public.analyses for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "programs_select_admin" on public.programs;
create policy "programs_select_admin"
  on public.programs for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "academy_credentials_select_admin"
  on public.academy_credentials;
create policy "academy_credentials_select_admin"
  on public.academy_credentials for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "academy_lesson_progress_select_admin"
  on public.academy_lesson_progress;
create policy "academy_lesson_progress_select_admin"
  on public.academy_lesson_progress for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "academy_test_attempts_select_admin"
  on public.academy_test_attempts;
create policy "academy_test_attempts_select_admin"
  on public.academy_test_attempts for select
  to authenticated
  using (public.is_admin_or_above());

-- admin_logs: allow admin (not only super_admin) to read / write
drop policy if exists "admin_logs_select_admin" on public.admin_logs;
create policy "admin_logs_select_admin"
  on public.admin_logs for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "admin_logs_insert_admin" on public.admin_logs;
create policy "admin_logs_insert_admin"
  on public.admin_logs for insert
  to authenticated
  with check (public.is_admin_or_above());

-- membership / credits: admin も更新可（roles.permissions と整合）
drop policy if exists "membership_insert_admin" on public.membership;
create policy "membership_insert_admin"
  on public.membership for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "membership_update_admin" on public.membership;
create policy "membership_update_admin"
  on public.membership for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "monthly_credit_insert_admin" on public.monthly_credit;
create policy "monthly_credit_insert_admin"
  on public.monthly_credit for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "monthly_credit_update_admin" on public.monthly_credit;
create policy "monthly_credit_update_admin"
  on public.monthly_credit for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "credit_tx_insert_admin" on public.credit_transactions;
create policy "credit_tx_insert_admin"
  on public.credit_transactions for insert
  to authenticated
  with check (public.is_admin_or_above());
