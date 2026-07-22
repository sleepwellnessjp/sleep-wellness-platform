-- Migration: 20260722220000_v1_rc_security_hardening
-- V1.0 RC: lock profile roles, prevent membership self-reactivation

-- 1) Signup: never accept admin/super_admin from client metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  assigned_role text;
  v_cert text;
  v_ym text := to_char(timezone('Asia/Tokyo', now()), 'YYYY-MM');
  v_credit public.monthly_credit;
begin
  assigned_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'instructor');

  -- Client metadata may only create instructor or client. Admins are provisioned by ops.
  if assigned_role not in ('instructor', 'client') then
    assigned_role := 'instructor';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (id) do nothing;

  if assigned_role = 'instructor' then
    v_cert := coalesce(new.raw_user_meta_data->>'certification_type', 'navigator');
    if v_cert not in (
      'navigator',
      'melatonin_yoga_instructor',
      'sleep_wellness_producer'
    ) then
      v_cert := 'navigator';
    end if;

    insert into public.membership (
      user_id,
      certification_type,
      certified_at,
      expires_at,
      status
    )
    values (
      new.id,
      v_cert,
      current_date,
      (current_date + interval '1 year')::date,
      'active'
    )
    on conflict (user_id, certification_type) do nothing;

    insert into public.monthly_credit (user_id, year_month, granted_amount, used_amount)
    values (new.id, v_ym, 30, 0)
    on conflict (user_id, year_month) do nothing
    returning * into v_credit;

    if found then
      insert into public.credit_transactions (
        user_id, type, amount, balance_after, reference_id, description, created_by
      ) values (
        new.id,
        'monthly_grant',
        v_credit.granted_amount,
        greatest(0, v_credit.granted_amount - v_credit.used_amount),
        v_credit.id,
        v_ym || ' 月次付与',
        null
      );
    end if;
  end if;

  return new;
end;
$$;

-- 2) Prevent users from escalating their own role via profiles UPDATE
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'profiles.role cannot be changed by clients';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
before update on public.profiles
for each row
execute function public.protect_profile_role();

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 3) Membership ensure: never reactivate suspended rows
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

  select * into v_row
  from public.membership
  where user_id = v_uid
    and certification_type = v_cert
  limit 1;

  if found then
    -- Do not force status back to active (admin may have suspended)
    return v_row;
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
    'ensure_instructor_membership'
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.ensure_instructor_membership(text) to authenticated;
