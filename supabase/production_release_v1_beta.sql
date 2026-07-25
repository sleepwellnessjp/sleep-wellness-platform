-- =============================================================================
-- production_release_v1_beta.sql
-- Version 1.0 Beta 本番適用（認定講師限定公開）
-- 対象:
--   1) certified_instructors / 依存マスタ
--   2) beta_instructor_invitations
--   3) analysis_history.client_id → ON DELETE CASCADE + DELETE RLS
-- 冪等: 再実行しても安全（IF NOT EXISTS / DROP IF EXISTS 使用）
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) 事前確認（結果を見てテーブル有無を確認）
-- ---------------------------------------------------------------------------
select
  to_regclass('public.certification_levels') as certification_levels,
  to_regclass('public.certified_schools') as certified_schools,
  to_regclass('public.certified_instructors') as certified_instructors,
  to_regclass('public.beta_instructor_invitations') as beta_instructor_invitations,
  to_regclass('public.analysis_history') as analysis_history,
  to_regclass('public.clients') as clients;

-- ---------------------------------------------------------------------------
-- 1) certification_levels（certified_instructors の FK 依存）
-- ---------------------------------------------------------------------------
create table if not exists public.certification_levels (
  id text primary key,
  label text not null,
  label_en text not null default '',
  sort_order integer not null default 0,
  description text not null default '',
  renewal_months integer not null default 12,
  ce_hours_required integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists certification_levels_set_updated_at on public.certification_levels;
create trigger certification_levels_set_updated_at
before update on public.certification_levels
for each row execute function public.set_updated_at();

alter table public.certification_levels enable row level security;

drop policy if exists "certification_levels_select_authenticated" on public.certification_levels;
create policy "certification_levels_select_authenticated"
  on public.certification_levels for select
  to authenticated
  using (true);

drop policy if exists "certification_levels_admin_all" on public.certification_levels;
create policy "certification_levels_admin_all"
  on public.certification_levels for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

insert into public.certification_levels (id, label, label_en, sort_order, description, renewal_months, ce_hours_required)
values
  ('foundation', 'Foundation', 'Foundation', 10, '睡眠ウェルネス基礎認定', 12, 4),
  ('practitioner', 'Practitioner', 'Practitioner', 20, '実践者認定', 12, 8),
  ('instructor', 'Instructor', 'Instructor', 30, '認定講師', 12, 12),
  ('navigator', 'Navigator', 'Navigator', 40, 'スリープウェルネス・ナビゲーター', 12, 16),
  ('producer', 'Producer', 'Producer', 50, 'スリープウェルネス・プロデューサー', 24, 20)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) certified_schools（certified_instructors.school_id の FK 依存）
-- ---------------------------------------------------------------------------
create table if not exists public.certified_schools (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  name_kana text not null default '',
  region text not null default '',
  prefecture text not null default '',
  address text not null default '',
  representative_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  status text not null default 'active',
  certified_at date not null default (current_date),
  admin_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certified_schools_code_unique unique (code),
  constraint certified_schools_status_check
    check (status in ('active', 'suspended', 'closed'))
);

create index if not exists certified_schools_status_idx
  on public.certified_schools (status, updated_at desc);

create index if not exists certified_schools_region_idx
  on public.certified_schools (region, prefecture);

drop trigger if exists certified_schools_set_updated_at on public.certified_schools;
create trigger certified_schools_set_updated_at
before update on public.certified_schools
for each row execute function public.set_updated_at();

alter table public.certified_schools enable row level security;

drop policy if exists "certified_schools_select_authenticated" on public.certified_schools;
create policy "certified_schools_select_authenticated"
  on public.certified_schools for select
  to authenticated
  using (true);

drop policy if exists "certified_schools_admin_all" on public.certified_schools;
create policy "certified_schools_admin_all"
  on public.certified_schools for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ---------------------------------------------------------------------------
-- 3) certified_instructors
-- ---------------------------------------------------------------------------
create table if not exists public.certified_instructors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid references public.certified_schools (id) on delete set null,
  level_id text not null references public.certification_levels (id),
  instructor_number text not null,
  display_name text not null default '',
  email text not null default '',
  status text not null default 'active',
  certified_at date not null,
  renews_at date not null,
  suspended_at timestamptz,
  withdrawn_at timestamptz,
  last_renewed_at date,
  status_history jsonb not null default '[]'::jsonb,
  admin_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certified_instructors_number_unique unique (instructor_number),
  constraint certified_instructors_user_unique unique (user_id),
  constraint certified_instructors_status_check
    check (
      status in (
        'active',
        'renewal_pending',
        'suspended',
        'withdrawn',
        'expired'
      )
    )
);

alter table public.certified_instructors
  add column if not exists usage_start_date date;

create index if not exists certified_instructors_school_idx
  on public.certified_instructors (school_id, status);

create index if not exists certified_instructors_status_idx
  on public.certified_instructors (status, renews_at);

create index if not exists certified_instructors_level_idx
  on public.certified_instructors (level_id, status);

create index if not exists certified_instructors_usage_start_idx
  on public.certified_instructors (usage_start_date);

drop trigger if exists certified_instructors_set_updated_at on public.certified_instructors;
create trigger certified_instructors_set_updated_at
before update on public.certified_instructors
for each row execute function public.set_updated_at();

alter table public.certified_instructors enable row level security;

drop policy if exists "certified_instructors_select_own_or_admin" on public.certified_instructors;
create policy "certified_instructors_select_own_or_admin"
  on public.certified_instructors for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_above());

drop policy if exists "certified_instructors_admin_all" on public.certified_instructors;
create policy "certified_instructors_admin_all"
  on public.certified_instructors for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- 既存講師（profiles + active membership）をバックフィル
do $$
begin
  if to_regclass('public.membership') is null then
    raise notice 'membership が無いため certified_instructors バックフィルをスキップ';
    return;
  end if;

  insert into public.certified_instructors (
    user_id,
    level_id,
    instructor_number,
    display_name,
    email,
    status,
    certified_at,
    renews_at,
    usage_start_date
  )
  select
    p.id,
    case m.certification_type
      when 'sleep_wellness_producer' then 'producer'
      when 'melatonin_yoga_instructor' then 'instructor'
      else 'navigator'
    end,
    'SWIJ-' || upper(substr(replace(p.id::text, '-', ''), 1, 10)),
    coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(p.email, ''), '@', 1), ''),
    coalesce(p.email, ''),
    'active',
    coalesce(m.certified_at, current_date),
    coalesce(m.expires_at, (current_date + interval '1 year')::date),
    null
  from public.profiles p
  inner join lateral (
    select m0.certification_type, m0.certified_at, m0.expires_at
    from public.membership m0
    where m0.user_id = p.id
      and m0.status = 'active'
    order by m0.certified_at desc nulls last
    limit 1
  ) m on true
  where p.role = 'instructor'
    and not exists (
      select 1
      from public.certified_instructors c
      where c.user_id = p.id
    )
  on conflict (user_id) do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- 4) beta_instructor_invitations
-- ---------------------------------------------------------------------------
create table if not exists public.beta_instructor_invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  instructor_name text not null,
  instructor_email text not null,
  start_date date not null,
  status text not null default 'draft',
  email_subject text not null default '',
  email_body text not null default '',
  terms_required boolean not null default true,
  terms_accepted_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_instructor_invitations_code_not_blank
    check (length(trim(code)) > 0),
  constraint beta_instructor_invitations_name_not_blank
    check (length(trim(instructor_name)) > 0),
  constraint beta_instructor_invitations_email_not_blank
    check (length(trim(instructor_email)) > 0),
  constraint beta_instructor_invitations_status_check
    check (status in ('draft', 'sent', 'accepted', 'expired', 'revoked'))
);

create unique index if not exists beta_instructor_invitations_code_uidx
  on public.beta_instructor_invitations (upper(code));

create index if not exists beta_instructor_invitations_created_idx
  on public.beta_instructor_invitations (created_at desc);

create index if not exists beta_instructor_invitations_status_idx
  on public.beta_instructor_invitations (status, created_at desc);

drop trigger if exists beta_instructor_invitations_set_updated_at
  on public.beta_instructor_invitations;
create trigger beta_instructor_invitations_set_updated_at
before update on public.beta_instructor_invitations
for each row execute function public.set_updated_at();

alter table public.beta_instructor_invitations enable row level security;

drop policy if exists beta_instructor_invitations_admin_all
  on public.beta_instructor_invitations;
create policy beta_instructor_invitations_admin_all
  on public.beta_instructor_invitations for all
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

drop policy if exists beta_instructor_invitations_select_by_code
  on public.beta_instructor_invitations;
create policy beta_instructor_invitations_select_by_code
  on public.beta_instructor_invitations for select
  to authenticated, anon
  using (true);

drop policy if exists beta_instructor_invitations_accept_update
  on public.beta_instructor_invitations;
create policy beta_instructor_invitations_accept_update
  on public.beta_instructor_invitations for update
  to authenticated, anon
  using (status in ('draft', 'sent'))
  with check (status in ('draft', 'sent', 'accepted'));

-- profiles.beta_terms_accepted_at（Closed Beta 同意）
alter table public.profiles
  add column if not exists beta_terms_accepted_at timestamptz;

-- ---------------------------------------------------------------------------
-- 5) analysis_history: client_id ON DELETE CASCADE + DELETE ポリシー
-- ---------------------------------------------------------------------------
do $$
declare
  fk_name text;
begin
  if to_regclass('public.analysis_history') is null then
    raise notice 'analysis_history が存在しないため CASCADE 変更をスキップ';
    return;
  end if;

  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'analysis_history'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'client_id'
  limit 1;

  if fk_name is not null then
    execute format(
      'alter table public.analysis_history drop constraint %I',
      fk_name
    );
  end if;
end $$;

do $$
begin
  if to_regclass('public.analysis_history') is null
     or to_regclass('public.clients') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'analysis_history'
      and constraint_name = 'analysis_history_client_id_fkey'
  ) then
    alter table public.analysis_history
      add constraint analysis_history_client_id_fkey
      foreign key (client_id)
      references public.clients (id)
      on delete cascade;
  end if;
end $$;

drop policy if exists "analysis_history_delete_own" on public.analysis_history;
do $$
begin
  if to_regclass('public.analysis_history') is null then
    raise notice 'analysis_history が無いため DELETE ポリシー作成をスキップ';
    return;
  end if;

  create policy "analysis_history_delete_own"
    on public.analysis_history for delete
    using (auth.uid() = user_id or public.is_admin_or_above());
end $$;

-- ---------------------------------------------------------------------------
-- 6) 事後確認
-- ---------------------------------------------------------------------------
select
  to_regclass('public.certified_instructors') as certified_instructors,
  to_regclass('public.beta_instructor_invitations') as beta_instructor_invitations;

select
  tc.constraint_name,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
 and tc.constraint_schema = rc.constraint_schema
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'analysis_history'
  and tc.constraint_type = 'FOREIGN KEY'
  and kcu.column_name = 'client_id';
-- 期待: delete_rule = 'CASCADE'
