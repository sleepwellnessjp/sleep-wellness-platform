-- Migration: 20260724160000_client_portal
-- Client Portal（クライアント専用画面）向けテーブル / RLS / 拡張

-- ------------------------------------------------------------
-- 1) client_profiles 拡張（既存テーブルを Portal 用途でも利用）
-- ------------------------------------------------------------
alter table public.client_profiles
  add column if not exists portal_enabled boolean not null default true;

alter table public.client_profiles
  add column if not exists current_goal_summary text not null default '';

alter table public.client_profiles
  add column if not exists improvement_target_score integer;

alter table public.client_profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

alter table public.client_profiles
  add column if not exists last_portal_seen_at timestamptz;

comment on column public.client_profiles.portal_enabled is
  'Client Portal 利用可否';
comment on column public.client_profiles.current_goal_summary is
  'ポータル Home に表示する現在の目標サマリー';
comment on column public.client_profiles.improvement_target_score is
  '睡眠スコアの目標値（達成率計算用）';
comment on column public.client_profiles.notification_prefs is
  '通知設定 JSON（homework / message / report 等）';
comment on column public.client_profiles.last_portal_seen_at is
  'クライアントがポータルを最後に開いた時刻';

-- 連携済みクライアント本人が自分のプロフィールを読める
drop policy if exists "client_profiles_select_linked_client"
  on public.client_profiles;
create policy "client_profiles_select_linked_client"
  on public.client_profiles for select
  to authenticated
  using (public.is_linked_client(client_id));

-- 本人が通知設定・最終閲覧のみ更新可（owner 以外の列は RPC 経由想定）
drop policy if exists "client_profiles_update_linked_portal_prefs"
  on public.client_profiles;
create policy "client_profiles_update_linked_portal_prefs"
  on public.client_profiles for update
  to authenticated
  using (public.is_linked_client(client_id))
  with check (public.is_linked_client(client_id));

-- ------------------------------------------------------------
-- 2) client_messages（認定講師 ↔ クライアント）
-- ------------------------------------------------------------
create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid not null
    references auth.users (id) on delete cascade,
  sender_role text not null
    check (sender_role in ('instructor', 'client')),
  sender_id uuid not null
    references auth.users (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_messages_body_not_blank
    check (length(trim(body)) > 0),
  constraint client_messages_body_max
    check (char_length(body) <= 4000)
);

create index if not exists client_messages_client_created_idx
  on public.client_messages (client_id, created_at desc);

create index if not exists client_messages_instructor_created_idx
  on public.client_messages (instructor_id, created_at desc);

create index if not exists client_messages_unread_idx
  on public.client_messages (client_id, read_at)
  where read_at is null;

comment on table public.client_messages is
  'Client Portal チャット（認定講師とクライアントのメッセージ）';

drop trigger if exists client_messages_set_updated_at on public.client_messages;
create trigger client_messages_set_updated_at
before update on public.client_messages
for each row execute function public.set_updated_at();

alter table public.client_messages enable row level security;

drop policy if exists "client_messages_select_linked_or_instructor"
  on public.client_messages;
create policy "client_messages_select_linked_or_instructor"
  on public.client_messages for select
  to authenticated
  using (
    public.is_linked_client(client_id)
    or instructor_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "client_messages_insert_linked_or_instructor"
  on public.client_messages;
create policy "client_messages_insert_linked_or_instructor"
  on public.client_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (
        sender_role = 'client'
        and public.is_linked_client(client_id)
      )
      or (
        sender_role = 'instructor'
        and instructor_id = auth.uid()
        and exists (
          select 1 from public.clients c
          where c.id = client_id
            and c.instructor_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "client_messages_update_linked_or_instructor"
  on public.client_messages;
create policy "client_messages_update_linked_or_instructor"
  on public.client_messages for update
  to authenticated
  using (
    public.is_linked_client(client_id)
    or instructor_id = auth.uid()
  )
  with check (
    public.is_linked_client(client_id)
    or instructor_id = auth.uid()
  );

-- ------------------------------------------------------------
-- 3) client_notifications
-- ------------------------------------------------------------
create table if not exists public.client_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  kind text not null
    check (
      kind in (
        'message',
        'homework',
        'report',
        'goal',
        'advice',
        'system'
      )
    ),
  title text not null default '',
  body text not null default '',
  href text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_notifications_client_created_idx
  on public.client_notifications (client_id, created_at desc);

create index if not exists client_notifications_unread_idx
  on public.client_notifications (client_id, read_at)
  where read_at is null;

comment on table public.client_notifications is
  'Client Portal 通知（宿題・メッセージ・レポート等）';

drop trigger if exists client_notifications_set_updated_at
  on public.client_notifications;
create trigger client_notifications_set_updated_at
before update on public.client_notifications
for each row execute function public.set_updated_at();

alter table public.client_notifications enable row level security;

drop policy if exists "client_notifications_select_linked"
  on public.client_notifications;
create policy "client_notifications_select_linked"
  on public.client_notifications for select
  to authenticated
  using (
    public.is_linked_client(client_id)
    or public.is_admin_or_above()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "client_notifications_insert_instructor"
  on public.client_notifications;
create policy "client_notifications_insert_instructor"
  on public.client_notifications for insert
  to authenticated
  with check (
    public.is_admin_or_above()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "client_notifications_update_linked"
  on public.client_notifications;
create policy "client_notifications_update_linked"
  on public.client_notifications for update
  to authenticated
  using (
    public.is_linked_client(client_id)
    or public.is_admin_or_above()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
  )
  with check (
    public.is_linked_client(client_id)
    or public.is_admin_or_above()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 4) client_goal_progress
-- ------------------------------------------------------------
create table if not exists public.client_goal_progress (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid
    references auth.users (id) on delete set null,
  title text not null,
  description text not null default '',
  category text not null default 'sleep'
    check (
      category in (
        'sleep',
        'homework',
        'lifestyle',
        'recovery',
        'other'
      )
    ),
  target_value numeric,
  current_value numeric,
  unit text not null default '',
  progress_percent integer not null default 0
    check (progress_percent >= 0 and progress_percent <= 100),
  status text not null default 'active'
    check (status in ('active', 'achieved', 'paused', 'archived')),
  starts_on date,
  target_on date,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_goal_progress_title_not_blank
    check (length(trim(title)) > 0)
);

create index if not exists client_goal_progress_client_status_idx
  on public.client_goal_progress (client_id, status, updated_at desc);

comment on table public.client_goal_progress is
  'Client Portal 睡眠改善目標と達成率';

drop trigger if exists client_goal_progress_set_updated_at
  on public.client_goal_progress;
create trigger client_goal_progress_set_updated_at
before update on public.client_goal_progress
for each row execute function public.set_updated_at();

alter table public.client_goal_progress enable row level security;

drop policy if exists "client_goal_progress_select_linked_or_instructor"
  on public.client_goal_progress;
create policy "client_goal_progress_select_linked_or_instructor"
  on public.client_goal_progress for select
  to authenticated
  using (
    public.is_linked_client(client_id)
    or instructor_id = auth.uid()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
    or public.is_admin_or_above()
  );

drop policy if exists "client_goal_progress_insert_instructor"
  on public.client_goal_progress;
create policy "client_goal_progress_insert_instructor"
  on public.client_goal_progress for insert
  to authenticated
  with check (
    public.is_admin_or_above()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "client_goal_progress_update_linked_or_instructor"
  on public.client_goal_progress;
create policy "client_goal_progress_update_linked_or_instructor"
  on public.client_goal_progress for update
  to authenticated
  using (
    public.is_linked_client(client_id)
    or instructor_id = auth.uid()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
    or public.is_admin_or_above()
  )
  with check (
    public.is_linked_client(client_id)
    or instructor_id = auth.uid()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
    or public.is_admin_or_above()
  );

-- ------------------------------------------------------------
-- 5) client_homeworks にメディア種別（動画 / PDF）を追加
-- ------------------------------------------------------------
alter table public.client_homeworks
  add column if not exists category text not null default 'homework';

alter table public.client_homeworks
  add column if not exists media_type text not null default 'none';

alter table public.client_homeworks
  add column if not exists media_url text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_homeworks_category_check'
  ) then
    alter table public.client_homeworks
      add constraint client_homeworks_category_check
      check (
        category in ('homework', 'breathing', 'yoga', 'other')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'client_homeworks_media_type_check'
  ) then
    alter table public.client_homeworks
      add constraint client_homeworks_media_type_check
      check (media_type in ('none', 'video', 'pdf'));
  end if;
end $$;

comment on column public.client_homeworks.category is
  '宿題カテゴリ（homework / breathing / yoga）';
comment on column public.client_homeworks.media_type is
  '添付メディア種別（none / video / pdf）';
comment on column public.client_homeworks.media_url is
  '動画・PDF の参照 URL（未設定可）';
