-- ============================================================
-- 公開講師ディレクトリ用ビュー
-- security_invoker = false（定義者権限）
-- WHERE は必ず is_public = true AND status = 'active'
-- email / admin_memo / user_id は含めない
-- Idempotent（SQL Editor で再実行可）
-- ============================================================

drop view if exists public.certified_instructors_directory;

create view public.certified_instructors_directory
with (security_invoker = false)
as
select
  id,
  public_name,
  public_display_name,
  display_name,
  legal_name,
  show_legal_name,
  level_id,
  headline,
  bio,
  career,
  activity_area,
  service_area,
  online_available,
  yoga_specialties,
  pilates_specialties,
  specialties,
  available_programs,
  profile_image_url,
  instagram_url,
  website_url,
  contact_email,
  display_order
from public.certified_instructors
where
  is_public = true
  and status = 'active';

comment on view public.certified_instructors_directory is
  '公開講師一覧・詳細用。機密列を含まない。is_public=true かつ status=active のみ。';

grant select on public.certified_instructors_directory to anon, authenticated;

-- ベース表の「公開行フル SELECT」ポリシーを削除（本人・管理者用は残す）
drop policy if exists "certified_instructors_select_public"
  on public.certified_instructors;
