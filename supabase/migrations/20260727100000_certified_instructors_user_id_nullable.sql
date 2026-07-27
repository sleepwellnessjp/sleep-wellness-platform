-- ============================================================
-- Migration: 20260727100000_certified_instructors_user_id_nullable
-- 認定講師をログインアカウント未作成のまま登録できるよう、
-- certified_instructors.user_id を NULL 許可にする。
-- Idempotent（SQL Editor で再実行可）
-- ============================================================

-- 1) NOT NULL を外す
alter table public.certified_instructors
  alter column user_id drop not null;

-- 2) FK を ON DELETE SET NULL に付け替え
--    （アカウント削除時も認定講師レコードは残し、後日再紐づけ可能にする）
alter table public.certified_instructors
  drop constraint if exists certified_instructors_user_id_fkey;

alter table public.certified_instructors
  add constraint certified_instructors_user_id_fkey
  foreign key (user_id)
  references public.profiles (id)
  on delete set null;

-- 3) unique(user_id) は PostgreSQL では NULL を複数許可するためそのまま維持
--    （未紐づけ講師を複数登録できる）

comment on column public.certified_instructors.user_id is
  'ログインアカウント（profiles.id）。未作成時は NULL。同一メールでのアカウント作成後に ensure_my_certified_instructor 等で紐づけ可能。';
