-- ============================================================
-- Pilot: Melatonin Yoga™ Instructor 資格付与
-- テーブル名は membership（単数）。memberships は存在しません。
-- Supabase SQL Editor に貼り付けて Run してください。
-- ============================================================

-- 1) membership テーブルが無い場合に備えて作成（既存なら何もしない）
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

alter table public.membership enable row level security;

-- 2) ログイン中 Instructor が自分の資格を安全に補完する RPC
--    （monthly_credit / role は変更しない）
create or replace function public.ensure_instructor_membership(
  p_certification_type text default 'melatonin_yoga_instructor'
)
returns public.membership
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_cert text;
  v_row public.membership;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'instructor' then
    raise exception 'only instructor can ensure membership';
  end if;

  v_cert := coalesce(nullif(trim(p_certification_type), ''), 'melatonin_yoga_instructor');
  if v_cert not in (
    'navigator',
    'melatonin_yoga_instructor',
    'sleep_wellness_producer'
  ) then
    v_cert := 'melatonin_yoga_instructor';
  end if;

  insert into public.membership (
    user_id,
    certification_type,
    certified_at,
    expires_at,
    status,
    continuing_education,
    admin_memo
  )
  values (
    v_uid,
    v_cert,
    current_date,
    (current_date + interval '1 year')::date,
    'active',
    '{}'::jsonb,
    'pilot ensure_instructor_membership'
  )
  on conflict (user_id, certification_type)
  do update set
    certified_at = coalesce(public.membership.certified_at, excluded.certified_at),
    expires_at = excluded.expires_at,
    status = 'active',
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.ensure_instructor_membership(text) to authenticated;

-- 3) 現在の試験運用アカウントへ直接付与
--    email: lightningbolt1111@icloud.com
--    role / monthly_credit は維持
do $$
declare
  v_user_id uuid;
  v_role text;
begin
  select id, role into v_user_id, v_role
  from public.profiles
  where lower(email) = lower('lightningbolt1111@icloud.com')
  limit 1;

  if v_user_id is null then
    raise exception 'profiles に lightningbolt1111@icloud.com が見つかりません';
  end if;

  update public.profiles
  set role = 'instructor'
  where id = v_user_id
    and role is distinct from 'instructor';

  insert into public.membership (
    user_id,
    certification_type,
    certified_at,
    expires_at,
    status,
    continuing_education,
    admin_memo
  )
  values (
    v_user_id,
    'melatonin_yoga_instructor',
    current_date,
    (current_date + interval '1 year')::date,
    'active',
    '{}'::jsonb,
    'pilot first cohort: Melatonin Yoga Instructor'
  )
  on conflict (user_id, certification_type)
  do update set
    certified_at = excluded.certified_at,
    expires_at = excluded.expires_at,
    status = 'active',
    admin_memo = excluded.admin_memo,
    updated_at = now();

  raise notice 'Granted melatonin_yoga_instructor to % (previous role=%)', v_user_id, v_role;
end $$;

-- 4) 確認
select
  p.email,
  p.role,
  m.certification_type,
  m.status,
  m.certified_at,
  m.expires_at,
  mc.year_month,
  mc.granted_amount,
  mc.used_amount,
  greatest(0, mc.granted_amount - mc.used_amount) as remaining
from public.profiles p
join public.membership m
  on m.user_id = p.id
 and m.certification_type = 'melatonin_yoga_instructor'
left join public.monthly_credit mc
  on mc.user_id = p.id
 and mc.year_month = to_char(timezone('Asia/Tokyo', now()), 'YYYY-MM')
where lower(p.email) = lower('lightningbolt1111@icloud.com');
