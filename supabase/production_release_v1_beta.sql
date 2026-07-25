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

-- ---------------------------------------------------------------------------
-- 7) clients.owner_id → instructor_id（講師スコープ分離）
-- ---------------------------------------------------------------------------
-- ============================================================
-- clients.owner_id → instructor_id
-- 認定講師ごとのクライアント分離を明示する
-- Migration: 20260722190000_clients_instructor_id
--
-- instructor_id = Supabase Auth のログインユーザー ID（auth.uid()）
-- 関連テーブル（analyses / client_profiles 等）の owner_id は変更しない。
-- ============================================================

-- 1. 列リネーム（未適用環境のみ）
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'owner_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'instructor_id'
  ) then
    alter table public.clients rename column owner_id to instructor_id;
  end if;
end $$;

alter index if exists clients_owner_id_idx
  rename to clients_instructor_id_idx;
alter index if exists clients_owner_updated_idx
  rename to clients_instructor_updated_idx;

comment on column public.clients.instructor_id is
  '担当認定講師の auth.users.id（Supabase Auth ログインユーザー）';

-- 2. clients RLS（instructor_id = auth.uid()）
drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
  on public.clients for select
  using (auth.uid() = instructor_id);

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
  on public.clients for insert
  with check (auth.uid() = instructor_id);

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
  on public.clients for update
  using (auth.uid() = instructor_id)
  with check (auth.uid() = instructor_id);

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
  on public.clients for delete
  using (auth.uid() = instructor_id);

-- 3. 子テーブル RLS: clients 参照を instructor_id に更新（テーブルが存在する場合のみ）
do $$
begin
  if to_regclass('public.client_profiles') is not null then
    drop policy if exists "client_profiles_insert_own" on public.client_profiles;
    create policy "client_profiles_insert_own"
      on public.client_profiles for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_profiles_update_own" on public.client_profiles;
    create policy "client_profiles_update_own"
      on public.client_profiles for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.client_guidance_notes') is not null then
    drop policy if exists "client_guidance_notes_insert_own"
      on public.client_guidance_notes;
    create policy "client_guidance_notes_insert_own"
      on public.client_guidance_notes for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_guidance_notes_update_own"
      on public.client_guidance_notes;
    create policy "client_guidance_notes_update_own"
      on public.client_guidance_notes for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.client_appointments') is not null then
    drop policy if exists "client_appointments_insert_own"
      on public.client_appointments;
    create policy "client_appointments_insert_own"
      on public.client_appointments for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_appointments_update_own"
      on public.client_appointments;
    create policy "client_appointments_update_own"
      on public.client_appointments for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.client_occupation_attributes') is not null then
    drop policy if exists "client_occupation_attributes_insert_own"
      on public.client_occupation_attributes;
    create policy "client_occupation_attributes_insert_own"
      on public.client_occupation_attributes for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_occupation_attributes_update_own"
      on public.client_occupation_attributes;
    create policy "client_occupation_attributes_update_own"
      on public.client_occupation_attributes for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.client_metric_baselines') is not null then
    drop policy if exists "client_metric_baselines_insert_own"
      on public.client_metric_baselines;
    create policy "client_metric_baselines_insert_own"
      on public.client_metric_baselines for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_metric_baselines_update_own"
      on public.client_metric_baselines;
    create policy "client_metric_baselines_update_own"
      on public.client_metric_baselines for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;
end $$;

-- 4. RPC: 新規登録時に auth.uid() を instructor_id へ自動保存
create or replace function public.create_client_with_profile(
  p_name text,
  p_name_kana text default null,
  p_memo text default null,
  p_tags text[] default '{}'
)
returns public.clients
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_kana text := nullif(btrim(coalesce(p_name_kana, '')), '');
  v_memo text := nullif(btrim(coalesce(p_memo, '')), '');
  v_tags text[] := coalesce(p_tags, '{}');
  v_client public.clients;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_name is null then
    raise exception 'Name is required';
  end if;

  select coalesce(array_agg(distinct btrim(t)), '{}')
  into v_tags
  from unnest(v_tags) as t
  where btrim(t) <> '';

  -- 同名（講師内・大小無視・空白正規化）があれば既存を返し、profile を確保
  select c.*
  into v_client
  from public.clients c
  where c.instructor_id = v_uid
    and lower(regexp_replace(btrim(c.name), '\s+', ' ', 'g'))
      = lower(regexp_replace(v_name, '\s+', ' ', 'g'))
  order by c.created_at asc
  limit 1;

  if found then
    insert into public.client_profiles (client_id, owner_id, basic)
    values (
      v_client.id,
      v_uid,
      jsonb_build_object('fullName', v_client.name)
    )
    on conflict (client_id) do nothing;

    return v_client;
  end if;

  insert into public.clients (instructor_id, name, name_kana, memo, tags)
  values (v_uid, v_name, v_kana, v_memo, v_tags)
  returning * into v_client;

  insert into public.client_profiles (client_id, owner_id, basic)
  values (
    v_client.id,
    v_uid,
    jsonb_build_object('fullName', v_client.name)
  );

  return v_client;
end;
$$;

comment on function public.create_client_with_profile(text, text, text, text[]) is
  'clients（instructor_id = auth.uid()）と空の client_profiles を同一トランザクションで作成。';

create or replace function public.ensure_client_profile(
  p_client_id uuid
)
returns public.client_profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_client public.clients;
  v_profile public.client_profiles;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select c.*
  into v_client
  from public.clients c
  where c.id = p_client_id
    and c.instructor_id = v_uid;

  if not found then
    raise exception 'Client not found';
  end if;

  select p.*
  into v_profile
  from public.client_profiles p
  where p.client_id = p_client_id
    and p.owner_id = v_uid;

  if found then
    return v_profile;
  end if;

  insert into public.client_profiles (client_id, owner_id, basic)
  values (
    v_client.id,
    v_uid,
    jsonb_build_object('fullName', v_client.name)
  )
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.create_client_with_profile(text, text, text, text[]) from public;
grant execute on function public.create_client_with_profile(text, text, text, text[]) to authenticated;

revoke all on function public.ensure_client_profile(uuid) from public;
grant execute on function public.ensure_client_profile(uuid) to authenticated;
