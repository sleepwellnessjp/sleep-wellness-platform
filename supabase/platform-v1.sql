-- Sleep Wellness Platform V1.0 — Platform tables
-- Run after base schema.sql in Supabase SQL Editor

-- ============================================================
-- roles (reference)
-- ============================================================
create table if not exists public.roles (
  id text primary key,
  label text not null,
  description text not null default '',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.roles (id, label, description, permissions)
values
  ('super_admin', 'Super Admin', '全権限', '{"all": true}'::jsonb),
  ('admin', 'Admin', '運営スタッフ', '{"credits": true, "membership": true, "members": true}'::jsonb),
  ('instructor', 'Instructor', '睡眠分析・履歴・プロフィール', '{"analysis": true}'::jsonb),
  ('client', 'Client', '自分のデータ閲覧のみ', '{"self": true}'::jsonb)
on conflict (id) do nothing;

-- ============================================================
-- profiles extension
-- ============================================================
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'instructor', 'client'));

-- ============================================================
-- membership (認定資格)
-- ============================================================
create table if not exists public.membership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  certification_type text not null
    check (certification_type in (
      'navigator',
      'melatonin_yoga_instructor',
      'sleep_wellness_producer'
    )),
  certified_at date,
  expires_at date,
  status text not null default 'active'
    check (status in ('active', 'renewal_pending', 'suspended', 'expired')),
  continuing_education jsonb not null default '{}'::jsonb,
  admin_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists membership_user_id_idx on public.membership (user_id);
create unique index if not exists membership_user_cert_unique
  on public.membership (user_id, certification_type);

drop trigger if exists membership_set_updated_at on public.membership;
create trigger membership_set_updated_at
before update on public.membership
for each row execute function public.set_updated_at();

-- ============================================================
-- monthly_credit
-- ============================================================
create table if not exists public.monthly_credit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year_month text not null,
  granted_amount integer not null default 30 check (granted_amount >= 0),
  used_amount integer not null default 0 check (used_amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, year_month)
);

create index if not exists monthly_credit_user_idx on public.monthly_credit (user_id, year_month desc);

-- ============================================================
-- credit_transactions
-- ============================================================
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in (
      'monthly_grant',
      'analysis_use',
      'purchase',
      'admin_grant',
      'admin_adjustment'
    )),
  amount integer not null,
  balance_after integer not null default 0,
  reference_id uuid,
  description text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_idx
  on public.credit_transactions (user_id, created_at desc);

-- ============================================================
-- analysis_history (platform-level)
-- ============================================================
create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  analysis_id uuid references public.analyses (id) on delete set null,
  client_name text not null default '',
  measurement_date date,
  sleep_score numeric,
  credits_consumed integer not null default 1 check (credits_consumed >= 0),
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists analysis_history_user_idx
  on public.analysis_history (user_id, created_at desc);

-- ============================================================
-- admin_logs
-- ============================================================
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_logs_created_idx on public.admin_logs (created_at desc);

-- ============================================================
-- notifications
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- ============================================================
-- Helper functions
-- ============================================================
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'super_admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('super_admin', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.roles enable row level security;
alter table public.membership enable row level security;
alter table public.monthly_credit enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.analysis_history enable row level security;
alter table public.admin_logs enable row level security;
alter table public.notifications enable row level security;

-- roles: readable by authenticated users
drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated"
  on public.roles for select
  to authenticated
  using (true);

-- membership
drop policy if exists "membership_select_own_or_admin" on public.membership;
create policy "membership_select_own_or_admin"
  on public.membership for select
  using (auth.uid() = user_id or public.is_admin_or_above());

drop policy if exists "membership_manage_admin" on public.membership;
create policy "membership_manage_admin"
  on public.membership for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- monthly_credit
drop policy if exists "monthly_credit_select_own_or_admin" on public.monthly_credit;
create policy "monthly_credit_select_own_or_admin"
  on public.monthly_credit for select
  using (auth.uid() = user_id or public.is_admin_or_above());

drop policy if exists "monthly_credit_manage_admin" on public.monthly_credit;
create policy "monthly_credit_manage_admin"
  on public.monthly_credit for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- credit_transactions
drop policy if exists "credit_tx_select_own_or_admin" on public.credit_transactions;
create policy "credit_tx_select_own_or_admin"
  on public.credit_transactions for select
  using (auth.uid() = user_id or public.is_admin_or_above());

drop policy if exists "credit_tx_insert_admin" on public.credit_transactions;
create policy "credit_tx_insert_admin"
  on public.credit_transactions for insert
  with check (public.is_super_admin() or auth.uid() = user_id);

-- analysis_history
drop policy if exists "analysis_history_select_own_or_admin" on public.analysis_history;
create policy "analysis_history_select_own_or_admin"
  on public.analysis_history for select
  using (auth.uid() = user_id or public.is_admin_or_above());

drop policy if exists "analysis_history_insert_own" on public.analysis_history;
create policy "analysis_history_insert_own"
  on public.analysis_history for insert
  with check (auth.uid() = user_id);

-- admin_logs: super admin only
drop policy if exists "admin_logs_super_admin" on public.admin_logs;
create policy "admin_logs_super_admin"
  on public.admin_logs for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- profiles: super admin can read all
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin_or_above());

-- ============================================================
-- Auto membership + monthly credit on signup (instructor)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text;
begin
  assigned_role := coalesce(new.raw_user_meta_data->>'role', 'instructor');

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (id) do nothing;

  if assigned_role = 'instructor' then
    insert into public.membership (
      user_id,
      certification_type,
      certified_at,
      expires_at,
      status
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'certification_type', 'navigator'),
      current_date,
      current_date + interval '1 year',
      'active'
    )
    on conflict (user_id, certification_type) do nothing;

    insert into public.monthly_credit (user_id, year_month, granted_amount, used_amount)
    values (
      new.id,
      to_char(now(), 'YYYY-MM'),
      30,
      0
    )
    on conflict (user_id, year_month) do nothing;
  end if;

  return new;
end;
$$;
