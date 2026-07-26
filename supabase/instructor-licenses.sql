-- ============================================================
-- Migration: 20260726180000_instructor_licenses
-- 認定講師ライセンス（本人確認 / 管理者編集）
-- certified_instructors / certification_levels と互換
-- Idempotent（SQL Editor で再実行可）
-- ============================================================

-- ------------------------------------------------------------
-- 1) instructor_licenses
-- ------------------------------------------------------------
create table if not exists public.instructor_licenses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.certified_instructors (id) on delete cascade,
  certification_level_id text not null references public.certification_levels (id),
  certification_name text not null default '',
  license_number text not null,
  issued_at date not null,
  expires_at date not null,
  status text not null default 'active',
  required_education_hours numeric(6,1) not null default 0,
  completed_education_hours numeric(6,1) not null default 0,
  renewal_status text not null default 'not_requested',
  renewal_requested_at timestamptz,
  admin_note text not null default '',
  verification_code text not null default '',
  issuer_name text not null default 'Sleep Wellness Institute Japan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instructor_licenses_instructor_unique unique (instructor_id),
  constraint instructor_licenses_number_unique unique (license_number),
  constraint instructor_licenses_status_check
    check (status in ('active', 'expiring', 'expired', 'suspended', 'pending')),
  constraint instructor_licenses_renewal_status_check
    check (
      renewal_status in (
        'not_requested',
        'requested',
        'approved',
        'rejected'
      )
    )
);

create index if not exists instructor_licenses_status_idx
  on public.instructor_licenses (status, expires_at);

create index if not exists instructor_licenses_level_idx
  on public.instructor_licenses (certification_level_id, status);

create index if not exists instructor_licenses_renewal_idx
  on public.instructor_licenses (renewal_status, renewal_requested_at desc);

create index if not exists instructor_licenses_verification_idx
  on public.instructor_licenses (verification_code)
  where verification_code <> '';

comment on table public.instructor_licenses is
  '認定講師ライセンス（本人閲覧・更新申請 / 管理者編集）';

drop trigger if exists instructor_licenses_set_updated_at on public.instructor_licenses;
create trigger instructor_licenses_set_updated_at
before update on public.instructor_licenses
for each row execute function public.set_updated_at();

-- verification_code が空なら発行時に埋める
create or replace function public.ensure_instructor_license_verification_code()
returns trigger
language plpgsql
as $$
begin
  if coalesce(trim(new.verification_code), '') = '' then
    new.verification_code :=
      'SWIJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  return new;
end;
$$;

drop trigger if exists instructor_licenses_ensure_verification
  on public.instructor_licenses;
create trigger instructor_licenses_ensure_verification
before insert or update on public.instructor_licenses
for each row execute function public.ensure_instructor_license_verification_code();

-- ------------------------------------------------------------
-- 2) RLS
-- ------------------------------------------------------------
alter table public.instructor_licenses enable row level security;

-- 本人: certified_instructors.user_id = auth.uid() のライセンスのみ閲覧
drop policy if exists "instructor_licenses_select_own_or_admin"
  on public.instructor_licenses;
create policy "instructor_licenses_select_own_or_admin"
  on public.instructor_licenses for select
  to authenticated
  using (
    public.is_admin_or_above()
    or exists (
      select 1
      from public.certified_instructors ci
      where ci.id = instructor_id
        and ci.user_id = auth.uid()
    )
  );

drop policy if exists "instructor_licenses_insert_admin"
  on public.instructor_licenses;
create policy "instructor_licenses_insert_admin"
  on public.instructor_licenses for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "instructor_licenses_update_admin"
  on public.instructor_licenses;
create policy "instructor_licenses_update_admin"
  on public.instructor_licenses for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "instructor_licenses_delete_admin"
  on public.instructor_licenses;
create policy "instructor_licenses_delete_admin"
  on public.instructor_licenses for delete
  to authenticated
  using (public.is_admin_or_above());

-- ------------------------------------------------------------
-- 3) 更新申請 RPC（認定講師本人のみ / カラム直接変更不可）
-- ------------------------------------------------------------
create or replace function public.request_instructor_license_renewal(
  p_license_id uuid
)
returns public.instructor_licenses
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.instructor_licenses;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;

  select il.*
  into v_row
  from public.instructor_licenses il
  join public.certified_instructors ci on ci.id = il.instructor_id
  where il.id = p_license_id
    and ci.user_id = v_uid
  for update of il;

  if not found then
    raise exception 'ライセンスが見つかりません';
  end if;

  if v_row.status = 'suspended' then
    raise exception '停止中のライセンスは更新申請できません';
  end if;

  if v_row.renewal_status = 'requested' then
    raise exception 'すでに更新申請済みです';
  end if;

  update public.instructor_licenses
  set
    renewal_status = 'requested',
    renewal_requested_at = now(),
    status = case
      when status in ('active', 'expiring', 'expired') then 'pending'
      else status
    end
  where id = p_license_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.request_instructor_license_renewal(uuid) from public;
grant execute on function public.request_instructor_license_renewal(uuid)
  to authenticated;

-- 公開検証（最小フィールドのみ / RLS バイパス）
create or replace function public.verify_instructor_license(
  p_code text
)
returns table (
  license_number text,
  certification_name text,
  holder_name text,
  issued_at date,
  expires_at date,
  status text,
  issuer_name text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if coalesce(trim(p_code), '') = '' then
    return;
  end if;

  return query
  select
    il.license_number,
    il.certification_name,
    coalesce(
      nullif(trim(ci.public_display_name), ''),
      nullif(trim(ci.display_name), ''),
      '認定講師'
    ) as holder_name,
    il.issued_at,
    il.expires_at,
    il.status,
    il.issuer_name
  from public.instructor_licenses il
  join public.certified_instructors ci on ci.id = il.instructor_id
  where il.verification_code = trim(p_code)
  limit 1;
end;
$$;

revoke all on function public.verify_instructor_license(text) from public;
grant execute on function public.verify_instructor_license(text)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 4) 既存 certified_instructors からの初期同期（未登録分のみ）
-- ------------------------------------------------------------
insert into public.instructor_licenses (
  instructor_id,
  certification_level_id,
  certification_name,
  license_number,
  issued_at,
  expires_at,
  status,
  required_education_hours,
  completed_education_hours,
  renewal_status,
  admin_note
)
select
  ci.id,
  ci.level_id,
  coalesce(nullif(trim(cl.label), ''), ci.level_id),
  ci.instructor_number,
  ci.certified_at,
  ci.renews_at,
  case
    when ci.status = 'suspended' then 'suspended'
    when ci.status = 'withdrawn' then 'suspended'
    when ci.status = 'expired' then 'expired'
    when ci.status = 'renewal_pending' then 'pending'
    when ci.renews_at <= (current_date + 90) and ci.renews_at >= current_date then 'expiring'
    when ci.renews_at < current_date then 'expired'
    else 'active'
  end,
  coalesce(cl.ce_hours_required, 0),
  0,
  case
    when ci.status = 'renewal_pending' then 'requested'
    else 'not_requested'
  end,
  coalesce(ci.admin_memo, '')
from public.certified_instructors ci
left join public.certification_levels cl on cl.id = ci.level_id
where not exists (
  select 1
  from public.instructor_licenses il
  where il.instructor_id = ci.id
)
on conflict (instructor_id) do nothing;

-- ------------------------------------------------------------
-- 5) 本人 certified_instructors 確保
-- ------------------------------------------------------------
-- supabase/migrations/20260726190000_ensure_my_certified_instructor.sql を
-- SQL Editor で続けて実行してください（protect バイパス + ensure + bundle RPC）。
