-- ============================================================
-- 認定インストラクターの活動・イベント
-- SQL Editor で実行可（idempotent）
-- 既存のワークショップ・リトリート（/retreat）とは別機能
-- ============================================================

create table if not exists public.instructor_activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  instructor_id uuid not null references public.certified_instructors (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  title text not null,
  image_url text not null default '',
  event_date date not null,
  start_time time,
  end_time time,
  location text not null default '',
  is_online boolean not null default false,
  summary text not null default '',
  description text not null default '',
  target text not null default '',
  capacity text not null default '',
  price text not null default '',
  application_url text not null default '',
  application_method text not null default '',
  notes text not null default '',
  instructor_name text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published boolean not null default false,
  featured boolean not null default false,
  approval_status text not null default 'auto_approved'
    check (approval_status in ('auto_approved', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instructor_activities_slug_unique unique (slug)
);

comment on table public.instructor_activities is
  '認定インストラクター本人が登録する活動・イベント（公開プロフィールの講師IDで紐づけ）';
comment on column public.instructor_activities.instructor_id is
  'certified_instructors.id。表示名ではなくIDで紐づける';
comment on column public.instructor_activities.created_by is
  '登録した auth.users.id';
comment on column public.instructor_activities.instructor_name is
  '公開表示用の講師名スナップショット（保存時に本人プロフィールから自動セット）';
comment on column public.instructor_activities.published is
  'status=published のとき true。公開面の絞り込み用';
comment on column public.instructor_activities.approval_status is
  '将来の管理者承認用。現状は auto_approved で本人公開可';

create index if not exists instructor_activities_public_idx
  on public.instructor_activities (event_date, featured, created_at desc)
  where published = true and status = 'published';

create index if not exists instructor_activities_instructor_idx
  on public.instructor_activities (instructor_id, event_date desc);

create index if not exists instructor_activities_owner_idx
  on public.instructor_activities (created_by, updated_at desc);

create or replace function public.touch_instructor_activity_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.published := (new.status = 'published');
  return new;
end;
$$;

drop trigger if exists instructor_activities_touch on public.instructor_activities;
create trigger instructor_activities_touch
  before insert or update on public.instructor_activities
  for each row
  execute function public.touch_instructor_activity_updated_at();

create or replace function public.is_own_instructor_activity(
  p_instructor_id uuid,
  p_created_by uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_created_by = auth.uid()
    and exists (
      select 1
      from public.certified_instructors ci
      where ci.id = p_instructor_id
        and ci.user_id = auth.uid()
        and ci.status = 'active'
    );
$$;

grant execute on function public.is_own_instructor_activity(uuid, uuid) to authenticated;

alter table public.instructor_activities enable row level security;

drop policy if exists "instructor_activities_select_public" on public.instructor_activities;
create policy "instructor_activities_select_public"
  on public.instructor_activities for select
  to anon, authenticated
  using (published = true and status = 'published');

drop policy if exists "instructor_activities_select_own" on public.instructor_activities;
create policy "instructor_activities_select_own"
  on public.instructor_activities for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "instructor_activities_insert_own" on public.instructor_activities;
create policy "instructor_activities_insert_own"
  on public.instructor_activities for insert
  to authenticated
  with check (
    public.is_own_instructor_activity(instructor_id, created_by)
    or public.is_admin_or_above()
  );

drop policy if exists "instructor_activities_update_own" on public.instructor_activities;
create policy "instructor_activities_update_own"
  on public.instructor_activities for update
  to authenticated
  using (
    public.is_own_instructor_activity(instructor_id, created_by)
    or public.is_admin_or_above()
  )
  with check (
    public.is_own_instructor_activity(instructor_id, created_by)
    or public.is_admin_or_above()
  );

drop policy if exists "instructor_activities_delete_own" on public.instructor_activities;
create policy "instructor_activities_delete_own"
  on public.instructor_activities for delete
  to authenticated
  using (
    public.is_own_instructor_activity(instructor_id, created_by)
    or public.is_admin_or_above()
  );

grant select on public.instructor_activities to anon, authenticated;
grant insert, update, delete on public.instructor_activities to authenticated;

-- Storage: イベント画像
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'instructor-activity-images',
  'instructor-activity-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "instructor_activity_images_public_read" on storage.objects;
create policy "instructor_activity_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'instructor-activity-images');

drop policy if exists "instructor_activity_images_insert_own" on storage.objects;
create policy "instructor_activity_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'instructor-activity-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "instructor_activity_images_update_own" on storage.objects;
create policy "instructor_activity_images_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'instructor-activity-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'instructor-activity-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "instructor_activity_images_delete_own" on storage.objects;
create policy "instructor_activity_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'instructor-activity-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "instructor_activity_images_admin_all" on storage.objects;
create policy "instructor_activity_images_admin_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'instructor-activity-images'
    and public.is_admin_or_above()
  )
  with check (
    bucket_id = 'instructor-activity-images'
    and public.is_admin_or_above()
  );
