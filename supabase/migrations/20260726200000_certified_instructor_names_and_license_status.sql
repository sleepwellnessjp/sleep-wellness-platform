-- ============================================================
-- Migration: 20260726200000_certified_instructor_names_and_license_status
-- 認定講師の活動名/本名カラム整備・複数講師対応・公開検証の最小化
-- Idempotent（SQL Editor で再実行可）
-- level_id = 'instructor' は変更しない
-- ============================================================

-- ------------------------------------------------------------
-- 1) certified_instructors: legal_name / public_name
-- ------------------------------------------------------------
alter table public.certified_instructors
  add column if not exists legal_name text not null default '',
  add column if not exists public_name text not null default '';

-- 後方互換: 既存の public_display_name があれば維持しつつ同期
alter table public.certified_instructors
  add column if not exists public_display_name text not null default '';

comment on column public.certified_instructors.legal_name is
  '本名（本人確認・認定証用。公開認証ページには出さない）';
comment on column public.certified_instructors.public_name is
  '活動名（表示優先。空の場合は display_name）';
comment on column public.certified_instructors.display_name is
  '後方互換用の表示名（public_name 未設定時のフォールバック）';

-- public_name 初期値: public_display_name → display_name
update public.certified_instructors
set public_name = coalesce(
  nullif(trim(public_name), ''),
  nullif(trim(public_display_name), ''),
  nullif(trim(display_name), ''),
  ''
)
where coalesce(trim(public_name), '') = '';

-- public_display_name を public_name に揃える（既存公開プロフィール互換）
update public.certified_instructors
set public_display_name = public_name
where coalesce(trim(public_name), '') <> ''
  and coalesce(trim(public_display_name), '') <> coalesce(trim(public_name), '');

create index if not exists certified_instructors_public_name_idx
  on public.certified_instructors (public_name);

create index if not exists certified_instructors_user_id_idx
  on public.certified_instructors (user_id);

-- ------------------------------------------------------------
-- 2) 既存「若林貴久」レコードの補完
--    活動名は既存 display_name を維持（公開表示の連続性を優先）
--    → public_name = display_name（若林貴久）、legal_name = 若林貴久
--    ※ 'TAKA' にはしない（認定証・/license の既存表示を壊さないため）
-- ------------------------------------------------------------
update public.certified_instructors
set
  public_name = coalesce(
    nullif(trim(public_name), ''),
    nullif(trim(display_name), ''),
    '若林貴久'
  ),
  legal_name = coalesce(nullif(trim(legal_name), ''), '若林貴久')
where
  display_name ilike '%若林%'
  or public_name ilike '%若林%'
  or public_display_name ilike '%若林%'
  or legal_name ilike '%若林%'
  or display_name ilike '%TAKA%'
  or public_name ilike '%TAKA%';

update public.certified_instructors
set public_display_name = public_name
where
  (
    display_name ilike '%若林%'
    or public_name ilike '%若林%'
    or legal_name ilike '%若林%'
  )
  and coalesce(trim(public_display_name), '') is distinct from coalesce(trim(public_name), '');

-- ------------------------------------------------------------
-- 3) instructor_licenses: withdrawn 追加 + 資格名正規化
-- ------------------------------------------------------------
alter table public.instructor_licenses
  drop constraint if exists instructor_licenses_status_check;

alter table public.instructor_licenses
  add constraint instructor_licenses_status_check
  check (
    status in (
      'active',
      'expiring',
      'expired',
      'suspended',
      'pending',
      'withdrawn'
    )
  );

update public.instructor_licenses
set certification_name = 'Sleep Wellness Instructor'
where
  coalesce(trim(certification_name), '') = ''
  or lower(trim(certification_name)) = 'instructor';

-- ------------------------------------------------------------
-- 4) 公開検証 RPC（公開してよい情報のみ / 本名・email・user_id 等は返さない）
-- ------------------------------------------------------------
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
declare
  v_code text := trim(coalesce(p_code, ''));
begin
  if v_code = '' then
    return;
  end if;

  return query
  select
    il.license_number,
    case
      when coalesce(trim(il.certification_name), '') = ''
        or lower(trim(il.certification_name)) = 'instructor'
      then 'Sleep Wellness Instructor'
      else trim(il.certification_name)
    end as certification_name,
    coalesce(
      nullif(trim(ci.public_name), ''),
      nullif(trim(ci.public_display_name), ''),
      nullif(trim(ci.display_name), ''),
      '認定講師'
    ) as holder_name,
    il.issued_at,
    il.expires_at,
    case
      when il.status in ('suspended', 'withdrawn', 'pending') then il.status
      when il.expires_at < current_date then 'expired'
      else il.status
    end as status,
    il.issuer_name
  from public.instructor_licenses il
  join public.certified_instructors ci on ci.id = il.instructor_id
  where il.verification_code = v_code
  limit 1;
end;
$$;

revoke all on function public.verify_instructor_license(text) from public;
grant execute on function public.verify_instructor_license(text) to anon, authenticated;

comment on function public.verify_instructor_license(text) is
  'QR公開認証。活動名・資格名・番号・日付・状態のみ。本名/email/user_id/管理メモ/継続教育は返さない';

-- ------------------------------------------------------------
-- 5) RLS 再確認: 本人は auth.uid() = user_id の行のみ（管理者は例外）
-- ------------------------------------------------------------
alter table public.certified_instructors enable row level security;
alter table public.instructor_licenses enable row level security;

drop policy if exists "certified_instructors_select_own_or_admin"
  on public.certified_instructors;
create policy "certified_instructors_select_own_or_admin"
  on public.certified_instructors for select
  to authenticated
  using (
    public.is_admin_or_above()
    or user_id = auth.uid()
  );

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

-- ensure_my_certified_instructor / get_my_instructor_license_bundle は
-- 20260726190000 を維持（protect バイパス込み）。本 migration では上書きしない。
-- アプリ層は public_name → display_name の優先で活動名を解決する。
