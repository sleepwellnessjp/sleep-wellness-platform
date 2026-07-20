-- Migration: 20260720130000_grant_pilot_membership
-- See also: supabase/grant-pilot-membership.sql

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

-- Direct grant for current pilot instructor account
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.profiles
  where lower(email) = lower('lightningbolt1111@icloud.com')
  limit 1;

  if v_user_id is null then
    raise notice 'pilot email not found; skip direct grant';
    return;
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
end $$;
