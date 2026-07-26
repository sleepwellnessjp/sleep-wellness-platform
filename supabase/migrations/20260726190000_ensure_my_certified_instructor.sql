-- ============================================================
-- Migration: 20260726190000_ensure_my_certified_instructor
-- 本人の certified_instructors / instructor_licenses を確保して返す
-- Idempotent（SQL Editor で再実行可）
-- ============================================================

-- ------------------------------------------------------------
-- 0) protect トリガー: security definer RPC からの user_id 再紐づけを許可
-- ------------------------------------------------------------
create or replace function public.protect_certified_instructor_ops_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ensure_my_certified_instructor 等からの一時バイパス
  if nullif(current_setting('swij.bypass_instructor_ops_protect', true), '') = '1' then
    return new;
  end if;

  if public.is_admin_or_above() then
    return new;
  end if;

  -- 本人更新でも運営管理項目は旧値を維持
  new.user_id := old.user_id;
  new.school_id := old.school_id;
  new.level_id := old.level_id;
  new.instructor_number := old.instructor_number;
  new.email := old.email;
  new.status := old.status;
  new.certified_at := old.certified_at;
  new.renews_at := old.renews_at;
  new.usage_start_date := old.usage_start_date;
  new.suspended_at := old.suspended_at;
  new.withdrawn_at := old.withdrawn_at;
  new.last_renewed_at := old.last_renewed_at;
  new.status_history := old.status_history;
  new.admin_memo := old.admin_memo;
  new.display_name := old.display_name;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1) ensure_my_certified_instructor
-- ------------------------------------------------------------
create or replace function public.ensure_my_certified_instructor()
returns public.certified_instructors
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_display_name text;
  v_role text;
  v_level text := 'instructor';
  v_row public.certified_instructors;
  v_by_email public.certified_instructors;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;

  if to_regclass('public.certified_instructors') is null then
    raise exception 'certified_instructors does not exist';
  end if;

  -- protect トリガーの user_id 固定を一時解除（email 再紐づけ用）
  perform set_config('swij.bypass_instructor_ops_protect', '1', true);

  select
    coalesce(p.email, ''),
    coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(p.email, ''), '@', 1), ''),
    coalesce(p.role, '')
  into v_email, v_display_name, v_role
  from public.profiles p
  where p.id = v_uid;

  if not found then
    raise exception 'ログインが必要です';
  end if;

  -- 1) user_id で本人レコードを探す
  select * into v_row
  from public.certified_instructors
  where user_id = v_uid
  limit 1;

  -- 2) email で既存レコードがあれば uid に紐づけ直す
  if not found and trim(v_email) <> '' then
    select * into v_by_email
    from public.certified_instructors
    where lower(trim(email)) = lower(trim(v_email))
    order by updated_at desc nulls last
    limit 1;

    if found
       and not exists (
         select 1
         from public.profiles owner
         where owner.id = v_by_email.user_id
           and lower(trim(coalesce(owner.email, ''))) <> lower(trim(v_email))
       ) then
      update public.certified_instructors
      set
        user_id = v_uid,
        email = coalesce(nullif(trim(email), ''), v_email),
        display_name = coalesce(nullif(trim(display_name), ''), v_display_name),
        updated_at = now()
      where id = v_by_email.id
      returning * into v_row;
    end if;
  end if;

  -- 3) 未登録なら本人 uid で作成（講師 / 管理者）
  if v_row.id is null then
    if v_role not in ('instructor', 'admin', 'super_admin', 'school') then
      raise exception '認定講師として登録されていません';
    end if;

    if to_regclass('public.certification_levels') is not null then
      if not exists (
        select 1 from public.certification_levels cl where cl.id = v_level
      ) then
        select cl.id into v_level
        from public.certification_levels cl
        where cl.is_active = true
        order by cl.sort_order nulls last, cl.id
        limit 1;
        v_level := coalesce(v_level, 'navigator');
      end if;
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
      admin_memo
    )
    values (
      v_uid,
      v_level,
      'SWIJ-' || upper(substr(replace(v_uid::text, '-', ''), 1, 10)),
      v_display_name,
      v_email,
      'active',
      current_date,
      (current_date + interval '1 year')::date,
      'ensure_my_certified_instructor'
    )
    on conflict (user_id) do update
      set updated_at = now()
    returning * into v_row;
  end if;

  -- 対応する instructor_licenses が無ければ初期行を作成
  if to_regclass('public.instructor_licenses') is not null
     and not exists (
       select 1
       from public.instructor_licenses il
       where il.instructor_id = v_row.id
     ) then
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
    values (
      v_row.id,
      v_row.level_id,
      coalesce(
        (
          select nullif(trim(cl.label), '')
          from public.certification_levels cl
          where cl.id = v_row.level_id
        ),
        v_row.level_id
      ),
      v_row.instructor_number,
      v_row.certified_at,
      v_row.renews_at,
      case
        when v_row.status = 'suspended' then 'suspended'
        when v_row.status = 'withdrawn' then 'suspended'
        when v_row.status = 'expired' then 'expired'
        when v_row.status = 'renewal_pending' then 'pending'
        when v_row.renews_at <= (current_date + 90) and v_row.renews_at >= current_date then 'expiring'
        when v_row.renews_at < current_date then 'expired'
        else 'active'
      end,
      coalesce(
        (
          select cl.ce_hours_required
          from public.certification_levels cl
          where cl.id = v_row.level_id
        ),
        0
      ),
      0,
      case
        when v_row.status = 'renewal_pending' then 'requested'
        else 'not_requested'
      end,
      coalesce(v_row.admin_memo, '')
    )
    on conflict (instructor_id) do nothing;
  end if;

  return v_row;
end;
$$;

revoke all on function public.ensure_my_certified_instructor() from public;
grant execute on function public.ensure_my_certified_instructor() to authenticated;

comment on function public.ensure_my_certified_instructor() is
  'ログイン中ユーザーの certified_instructors を uid 優先・email フォールバックで確保し、instructor_licenses も初期作成する';

-- ------------------------------------------------------------
-- 2) get_my_instructor_license_bundle（RLS を避けた本人向け一括取得）
-- ------------------------------------------------------------
create or replace function public.get_my_instructor_license_bundle()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_instructor public.certified_instructors;
  v_license public.instructor_licenses;
  v_level_label text;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;

  begin
    v_instructor := public.ensure_my_certified_instructor();
  exception
    when others then
      if SQLERRM like '%認定講師として登録されていません%' then
        return jsonb_build_object(
          'ok', true,
          'not_certified_instructor', true,
          'instructor', null,
          'license', null,
          'level_label', null
        );
      end if;
      raise;
  end;

  if to_regclass('public.instructor_licenses') is not null then
    select * into v_license
    from public.instructor_licenses
    where instructor_id = v_instructor.id
    limit 1;
  end if;

  if v_license.id is not null then
    select nullif(trim(cl.label), '') into v_level_label
    from public.certification_levels cl
    where cl.id = v_license.certification_level_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'not_certified_instructor', false,
    'instructor', to_jsonb(v_instructor),
    'license', case when v_license.id is null then null else to_jsonb(v_license) end,
    'level_label', coalesce(v_level_label, v_instructor.level_id)
  );
end;
$$;

revoke all on function public.get_my_instructor_license_bundle() from public;
grant execute on function public.get_my_instructor_license_bundle() to authenticated;

comment on function public.get_my_instructor_license_bundle() is
  '本人の認定講師・ライセンスを RLS バイパスで一括取得（未登録時は not_certified_instructor）';

-- ------------------------------------------------------------
-- 3) 既存 profiles（講師・管理者）のバックフィル（user_id 未連結のみ）
-- ------------------------------------------------------------
insert into public.certified_instructors (
  user_id,
  level_id,
  instructor_number,
  display_name,
  email,
  status,
  certified_at,
  renews_at,
  admin_memo
)
select
  p.id,
  case
    when exists (
      select 1 from public.certification_levels cl where cl.id = 'instructor'
    ) then 'instructor'
    when exists (
      select 1 from public.certification_levels cl where cl.id = 'navigator'
    ) then 'navigator'
    else (
      select cl.id
      from public.certification_levels cl
      order by cl.sort_order nulls last, cl.id
      limit 1
    )
  end,
  'SWIJ-' || upper(substr(replace(p.id::text, '-', ''), 1, 10)),
  coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(p.email, ''), '@', 1), ''),
  coalesce(p.email, ''),
  'active',
  current_date,
  (current_date + interval '1 year')::date,
  'backfill ensure_my_certified_instructor'
from public.profiles p
where p.role in ('instructor', 'admin', 'super_admin')
  and not exists (
    select 1
    from public.certified_instructors c
    where c.user_id = p.id
  )
  and not exists (
    select 1
    from public.certified_instructors c
    where trim(c.email) <> ''
      and lower(trim(c.email)) = lower(trim(coalesce(p.email, '')))
  )
on conflict (user_id) do nothing;

-- email 一致だが user_id が違う既存レコードを本人 uid に再紐づけ
select set_config('swij.bypass_instructor_ops_protect', '1', true);

update public.certified_instructors c
set
  user_id = p.id,
  updated_at = now(),
  admin_memo = case
    when position('relinked_by_email' in coalesce(c.admin_memo, '')) > 0
      then c.admin_memo
    else trim(both from coalesce(c.admin_memo, '') || ' relinked_by_email')
  end
from public.profiles p
where p.role in ('instructor', 'admin', 'super_admin')
  and trim(coalesce(p.email, '')) <> ''
  and lower(trim(c.email)) = lower(trim(p.email))
  and c.user_id is distinct from p.id
  and not exists (
    select 1
    from public.certified_instructors other
    where other.user_id = p.id
  )
  and (
    not exists (select 1 from public.profiles owner where owner.id = c.user_id)
    or exists (
      select 1
      from public.profiles owner
      where owner.id = c.user_id
        and lower(trim(coalesce(owner.email, ''))) = lower(trim(c.email))
    )
  );

-- certified_instructors にあって instructor_licenses が無い行を初期同期
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
where to_regclass('public.instructor_licenses') is not null
  and not exists (
    select 1
    from public.instructor_licenses il
    where il.instructor_id = ci.id
  )
on conflict (instructor_id) do nothing;
