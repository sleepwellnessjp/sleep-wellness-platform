-- Closed Beta ログイン修正
-- Migration: 20260724310000_closed_beta_login_cert_sync
--
-- 問題: ログインゲートは certified_instructors のみ参照するが、
--       signup（handle_new_user）は membership のみ作成していた。
-- 対応: 講師 signup 時に certified_instructors も作成し、既存講師をバックフィル。

-- ============================================================
-- 既存の認定講師（profiles + active membership）をバックフィル
-- ============================================================
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

-- ============================================================
-- signup: membership に加え certified_instructors も作成
-- ============================================================
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
  v_level text;
  v_ym text := to_char(timezone('Asia/Tokyo', now()), 'YYYY-MM');
  v_credit public.monthly_credit;
  v_display_name text;
begin
  assigned_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'instructor');

  -- Client metadata may only create instructor or client. Admins are provisioned by ops.
  if assigned_role not in ('instructor', 'client') then
    assigned_role := 'instructor';
  end if;

  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    v_display_name,
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

    v_level := case v_cert
      when 'sleep_wellness_producer' then 'producer'
      when 'melatonin_yoga_instructor' then 'instructor'
      else 'navigator'
    end;

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

    -- Closed Beta ログインゲート用の運営レコード
    if to_regclass('public.certified_instructors') is not null
       and to_regclass('public.certification_levels') is not null then
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
      values (
        new.id,
        case
          when exists (
            select 1 from public.certification_levels cl where cl.id = v_level
          ) then v_level
          else 'navigator'
        end,
        'SWIJ-' || upper(substr(replace(new.id::text, '-', ''), 1, 10)),
        coalesce(v_display_name, ''),
        coalesce(new.email, ''),
        'active',
        current_date,
        (current_date + interval '1 year')::date,
        null
      )
      on conflict (user_id) do nothing;
    end if;

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
