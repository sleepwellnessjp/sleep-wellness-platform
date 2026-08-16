-- ============================================================
-- 認定インストラクターの活動予定（トップページ文字一覧用）
-- SQL Editor で実行可（idempotent）
-- 既存の instructor_activities（イベント管理）とは別テーブル
-- ============================================================

create table if not exists public.instructor_activity_schedules (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.certified_instructors (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  title text not null,
  summary text not null default '',
  external_url text not null,
  instructor_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.instructor_activity_schedules is
  '認定インストラクター本人が登録する活動予定（日付・タイトル・短い説明・外部リンク）。トップページは文字のみ表示';
comment on column public.instructor_activity_schedules.instructor_id is
  'certified_instructors.id';
comment on column public.instructor_activity_schedules.created_by is
  '登録した auth.users.id。本人以外は編集不可';
comment on column public.instructor_activity_schedules.external_url is
  '講師本人のホームページまたは Instagram 等。トップページから別タブで開く';

create index if not exists instructor_activity_schedules_home_idx
  on public.instructor_activity_schedules (activity_date desc, created_at desc);

create index if not exists instructor_activity_schedules_owner_idx
  on public.instructor_activity_schedules (created_by, activity_date desc);

create or replace function public.touch_instructor_activity_schedule_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists instructor_activity_schedules_touch
  on public.instructor_activity_schedules;
create trigger instructor_activity_schedules_touch
  before insert or update on public.instructor_activity_schedules
  for each row
  execute function public.touch_instructor_activity_schedule_updated_at();

alter table public.instructor_activity_schedules enable row level security;

drop policy if exists "instructor_activity_schedules_select_public"
  on public.instructor_activity_schedules;
create policy "instructor_activity_schedules_select_public"
  on public.instructor_activity_schedules for select
  to anon, authenticated
  using (true);

drop policy if exists "instructor_activity_schedules_select_own"
  on public.instructor_activity_schedules;
create policy "instructor_activity_schedules_select_own"
  on public.instructor_activity_schedules for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "instructor_activity_schedules_insert_own"
  on public.instructor_activity_schedules;
create policy "instructor_activity_schedules_insert_own"
  on public.instructor_activity_schedules for insert
  to authenticated
  with check (
    public.is_own_instructor_activity(instructor_id, created_by)
    or public.is_admin_or_above()
  );

drop policy if exists "instructor_activity_schedules_update_own"
  on public.instructor_activity_schedules;
create policy "instructor_activity_schedules_update_own"
  on public.instructor_activity_schedules for update
  to authenticated
  using (
    public.is_own_instructor_activity(instructor_id, created_by)
    or public.is_admin_or_above()
  )
  with check (
    public.is_own_instructor_activity(instructor_id, created_by)
    or public.is_admin_or_above()
  );

drop policy if exists "instructor_activity_schedules_delete_own"
  on public.instructor_activity_schedules;
create policy "instructor_activity_schedules_delete_own"
  on public.instructor_activity_schedules for delete
  to authenticated
  using (
    public.is_own_instructor_activity(instructor_id, created_by)
    or public.is_admin_or_above()
  );

grant select on public.instructor_activity_schedules to anon, authenticated;
grant insert, update, delete on public.instructor_activity_schedules to authenticated;
