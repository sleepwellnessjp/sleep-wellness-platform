-- ============================================================
-- 活動予定の公開／非公開（idempotent）
-- 既存の instructor_activity_schedules に published を追加
-- トップページは published = true のみ表示
-- ============================================================

alter table public.instructor_activity_schedules
  add column if not exists published boolean not null default true;

comment on column public.instructor_activity_schedules.published is
  'true のときトップページの活動予定に表示。本部が公開／非公開を管理';

create index if not exists instructor_activity_schedules_published_home_idx
  on public.instructor_activity_schedules (created_at desc, activity_date desc)
  where published = true;

drop policy if exists "instructor_activity_schedules_select_public"
  on public.instructor_activity_schedules;
create policy "instructor_activity_schedules_select_public"
  on public.instructor_activity_schedules for select
  to anon, authenticated
  using (published = true);
