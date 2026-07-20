-- Sleep Wellness Platform — Supabase schema
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'instructor',
  created_at timestamptz not null default now()
);

-- ============================================================
-- clients
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  name_kana text,
  birth_date date,
  gender text,
  email text,
  phone text,
  registered_at date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_owner_id_idx on public.clients (owner_id);
create index if not exists clients_owner_updated_idx on public.clients (owner_id, updated_at desc);

-- ============================================================
-- analyses
-- ============================================================
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  analyzed_at timestamptz not null default now(),
  sleep_score numeric,
  sleep_duration numeric,
  sleep_efficiency numeric,
  deep_sleep numeric,
  awakenings numeric,
  sleep_latency numeric,
  spo2 numeric,
  hrv numeric,
  resting_heart_rate numeric,
  ocr_data jsonb,
  ai_result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analyses_owner_id_idx on public.analyses (owner_id);
create index if not exists analyses_client_id_idx on public.analyses (client_id);
create index if not exists analyses_owner_analyzed_idx on public.analyses (owner_id, analyzed_at desc);

-- ============================================================
-- programs
-- ============================================================
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  start_date date,
  current_phase text not null default '—',
  next_follow_up_date date,
  progress_label text not null default '未作成',
  status text not null default 'active',
  goals jsonb not null default '[]'::jsonb,
  menu_items jsonb not null default '[]'::jsonb,
  instructor_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);

create index if not exists programs_owner_id_idx on public.programs (owner_id);
create index if not exists programs_client_id_idx on public.programs (client_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'instructor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.analyses enable row level security;
alter table public.programs enable row level security;

-- profiles: own row only
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- clients: owner only
drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
  on public.clients for select
  using (auth.uid() = owner_id);

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
  on public.clients for insert
  with check (auth.uid() = owner_id);

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
  on public.clients for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
  on public.clients for delete
  using (auth.uid() = owner_id);

-- analyses: owner only
drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own"
  on public.analyses for select
  using (auth.uid() = owner_id);

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own"
  on public.analyses for insert
  with check (auth.uid() = owner_id);

drop policy if exists "analyses_update_own" on public.analyses;
create policy "analyses_update_own"
  on public.analyses for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "analyses_delete_own" on public.analyses;
create policy "analyses_delete_own"
  on public.analyses for delete
  using (auth.uid() = owner_id);

-- programs: owner only
drop policy if exists "programs_select_own" on public.programs;
create policy "programs_select_own"
  on public.programs for select
  using (auth.uid() = owner_id);

drop policy if exists "programs_insert_own" on public.programs;
create policy "programs_insert_own"
  on public.programs for insert
  with check (auth.uid() = owner_id);

drop policy if exists "programs_update_own" on public.programs;
create policy "programs_update_own"
  on public.programs for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "programs_delete_own" on public.programs;
create policy "programs_delete_own"
  on public.programs for delete
  using (auth.uid() = owner_id);

-- ============================================================
-- Platform V1.0 (see supabase/platform-v1.sql for full migration)
-- ============================================================
-- Run supabase/platform-v1.sql after this file for:
-- roles, membership, monthly_credit, credit_transactions,
-- analysis_history, admin_logs, notifications
