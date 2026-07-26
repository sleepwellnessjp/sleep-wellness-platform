-- ============================================================
-- Migration: 20260726210000_grant_founder_admin_role
-- Founder（TAKA / 若林貴久）の profiles.role を admin に昇格
-- /admin/instructors・/admin/licenses 等の本部画面アクセス用
-- Idempotent（SQL Editor で再実行可）
-- ============================================================

-- protect_profile_role は auth.role() <> service_role のとき role 変更を拒否する。
-- SQL Editor（postgres）でも auth.role() は空のため、トリガーがある場合だけ一時無効化する。
do $$
declare
  v_has_protect_trigger boolean := false;
begin
  select exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and t.tgname = 'trg_protect_profile_role'
      and not t.tgisinternal
  )
  into v_has_protect_trigger;

  if v_has_protect_trigger then
    execute 'alter table public.profiles disable trigger trg_protect_profile_role';
  end if;

  begin
    update public.profiles p
    set role = 'admin'
    where
      p.role is distinct from 'admin'
      and p.role is distinct from 'super_admin'
      and (
        -- certified_instructors に連結済みの Founder
        exists (
          select 1
          from public.certified_instructors ci
          where ci.user_id = p.id
            and (
              nullif(trim(ci.public_name), '') = 'TAKA'
              or nullif(trim(ci.legal_name), '') = '若林貴久'
              or ci.display_name ilike '%若林%'
              or ci.public_name ilike '%TAKA%'
              or ci.public_display_name ilike '%TAKA%'
              or ci.legal_name ilike '%若林%'
            )
        )
        -- email 一致（user_id 未連結のフォールバック）
        or (
          coalesce(trim(p.email), '') <> ''
          and exists (
            select 1
            from public.certified_instructors ci
            where lower(trim(ci.email)) = lower(trim(p.email))
              and (
                nullif(trim(ci.public_name), '') = 'TAKA'
                or nullif(trim(ci.legal_name), '') = '若林貴久'
                or ci.display_name ilike '%若林%'
                or ci.public_name ilike '%TAKA%'
                or ci.legal_name ilike '%若林%'
              )
          )
        )
        -- profiles 側の表示名
        or p.display_name ilike '%若林%'
        or p.display_name ilike '%TAKA%'
      );
  exception
    when others then
      if v_has_protect_trigger then
        execute 'alter table public.profiles enable trigger trg_protect_profile_role';
      end if;
      raise;
  end;

  if v_has_protect_trigger then
    execute 'alter table public.profiles enable trigger trg_protect_profile_role';
  end if;
end $$;

-- 確認用（実行結果として 1 行以上出れば成功）
select
  p.id,
  p.email,
  p.display_name,
  p.role
from public.profiles p
where p.role = 'admin'
  and (
    p.display_name ilike '%若林%'
    or p.display_name ilike '%TAKA%'
    or exists (
      select 1
      from public.certified_instructors ci
      where ci.user_id = p.id
        and (
          ci.public_name = 'TAKA'
          or ci.legal_name = '若林貴久'
        )
    )
  );
