-- ============================================================
-- Migration: 20260726140000_instructor_public_profiles
-- メラトニンヨガ™認定講師 公開プロフィール
-- Idempotent（SQL Editor で再実行可）
-- ============================================================

-- ------------------------------------------------------------
-- 1) プロフィール列（既存 display_name / user_id と互換）
-- ------------------------------------------------------------
alter table public.certified_instructors
  add column if not exists profile_image_url text,
  add column if not exists public_display_name text not null default '',
  add column if not exists legal_name text not null default '',
  add column if not exists show_legal_name boolean not null default false,
  add column if not exists headline text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists career text not null default '',
  add column if not exists activity_area text not null default '',
  add column if not exists service_area text not null default '',
  add column if not exists online_available boolean not null default false,
  add column if not exists yoga_specialties text[] not null default '{}'::text[],
  add column if not exists pilates_specialties text[] not null default '{}'::text[],
  add column if not exists specialties text[] not null default '{}'::text[],
  add column if not exists available_programs text[] not null default '{}'::text[],
  add column if not exists instagram_url text not null default '',
  add column if not exists website_url text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists is_public boolean not null default false,
  add column if not exists recommendation_note text not null default '',
  add column if not exists display_order integer not null default 1000,
  add column if not exists profile_updated_at timestamptz;

comment on column public.certified_instructors.profile_image_url is
  '公開プロフィール写真（Supabase Storage URL）';
comment on column public.certified_instructors.public_display_name is
  '公開用の活動名（空の場合は display_name をフォールバック）';
comment on column public.certified_instructors.legal_name is
  '本名（show_legal_name=true のときのみ公開表示）';
comment on column public.certified_instructors.show_legal_name is
  '本名を公開ページに表示するか';
comment on column public.certified_instructors.is_public is
  'true のときのみ /instructors 公開一覧・詳細に表示（既定は非公開）';
comment on column public.certified_instructors.recommendation_note is
  '表示順・推薦に使う任意メモ（講師本人が入力）';
comment on column public.certified_instructors.display_order is
  '公開一覧の表示順（小さいほど先頭）';
comment on column public.certified_instructors.profile_updated_at is
  'プロフィール最終更新日時（本人保存時に更新）';

-- 既存 display_name を公開活動名の初期値に（空の行のみ）
update public.certified_instructors
set public_display_name = display_name
where coalesce(trim(public_display_name), '') = ''
  and coalesce(trim(display_name), '') <> '';

create index if not exists certified_instructors_public_idx
  on public.certified_instructors (is_public, display_order, public_display_name)
  where is_public = true;

create index if not exists certified_instructors_activity_area_idx
  on public.certified_instructors (activity_area)
  where is_public = true;

create index if not exists certified_instructors_online_idx
  on public.certified_instructors (online_available)
  where is_public = true;

-- ------------------------------------------------------------
-- 2) RLS: 公開プロフィール閲覧 + 本人更新
-- ------------------------------------------------------------
-- 既存: select own_or_admin / admin_all は維持し、公開用・本人更新を追加

drop policy if exists "certified_instructors_select_public" on public.certified_instructors;
create policy "certified_instructors_select_public"
  on public.certified_instructors for select
  to anon, authenticated
  using (
    is_public = true
    and status = 'active'
  );

drop policy if exists "certified_instructors_update_own_profile" on public.certified_instructors;
create policy "certified_instructors_update_own_profile"
  on public.certified_instructors for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- certification_levels は公開ページの資格表示用に anon も閲覧可
drop policy if exists "certification_levels_select_public" on public.certification_levels;
create policy "certification_levels_select_public"
  on public.certification_levels for select
  to anon, authenticated
  using (is_active = true);

-- ------------------------------------------------------------
-- 3) プロフィール更新時に profile_updated_at を自動セット
--    （運営フィールドのみの更新では触らないよう、プロフィール列変更時のみ）
-- ------------------------------------------------------------
create or replace function public.touch_instructor_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (
    new.profile_image_url is distinct from old.profile_image_url
    or new.public_display_name is distinct from old.public_display_name
    or new.legal_name is distinct from old.legal_name
    or new.show_legal_name is distinct from old.show_legal_name
    or new.headline is distinct from old.headline
    or new.bio is distinct from old.bio
    or new.career is distinct from old.career
    or new.activity_area is distinct from old.activity_area
    or new.service_area is distinct from old.service_area
    or new.online_available is distinct from old.online_available
    or new.yoga_specialties is distinct from old.yoga_specialties
    or new.pilates_specialties is distinct from old.pilates_specialties
    or new.specialties is distinct from old.specialties
    or new.available_programs is distinct from old.available_programs
    or new.instagram_url is distinct from old.instagram_url
    or new.website_url is distinct from old.website_url
    or new.contact_email is distinct from old.contact_email
    or new.is_public is distinct from old.is_public
    or new.recommendation_note is distinct from old.recommendation_note
    or new.display_order is distinct from old.display_order
  ) then
    new.profile_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists certified_instructors_touch_profile_updated_at
  on public.certified_instructors;
create trigger certified_instructors_touch_profile_updated_at
before update on public.certified_instructors
for each row execute function public.touch_instructor_profile_updated_at();

-- ------------------------------------------------------------
-- 4) 講師本人は運営フィールド（資格状態・番号等）を変更不可
--    管理者の更新は is_admin_or_above() で許可
-- ------------------------------------------------------------
create or replace function public.protect_certified_instructor_ops_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
  -- display_name は運営側の表示名として維持（公開名は public_display_name）
  new.display_name := old.display_name;
  return new;
end;
$$;

drop trigger if exists certified_instructors_protect_ops_fields
  on public.certified_instructors;
create trigger certified_instructors_protect_ops_fields
before update on public.certified_instructors
for each row execute function public.protect_certified_instructor_ops_fields();
