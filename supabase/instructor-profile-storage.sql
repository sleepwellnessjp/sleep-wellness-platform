-- ============================================================
-- Supabase Storage: 認定講師プロフィール写真
-- SQL Editor で手動実行してください
-- Bucket: instructor-profiles（public read / 本人のみ write）
-- ============================================================

-- 1) Bucket 作成（public = true → 公開URLで画像表示）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'instructor-profiles',
  'instructor-profiles',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) パス規約: {auth.uid()}/profile.webp （または .jpg / .png）
--    先頭フォルダ名が user_id と一致するときのみ本人操作可

drop policy if exists "instructor_profiles_public_read" on storage.objects;
create policy "instructor_profiles_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'instructor-profiles');

drop policy if exists "instructor_profiles_insert_own" on storage.objects;
create policy "instructor_profiles_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'instructor-profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "instructor_profiles_update_own" on storage.objects;
create policy "instructor_profiles_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'instructor-profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'instructor-profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "instructor_profiles_delete_own" on storage.objects;
create policy "instructor_profiles_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'instructor-profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 管理者は全オブジェクト操作可
drop policy if exists "instructor_profiles_admin_all" on storage.objects;
create policy "instructor_profiles_admin_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'instructor-profiles'
    and public.is_admin_or_above()
  )
  with check (
    bucket_id = 'instructor-profiles'
    and public.is_admin_or_above()
  );
