-- ============================================================
-- client_appointments — クライアント詳細の次回予定
-- Migration: 20260722180000_client_appointments
-- Google Calendar 連携を見据えた日時・場所・説明の構造
-- ============================================================

create table if not exists public.client_appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  owner_id uuid not null
    references auth.users (id) on delete cascade,
  -- Google Calendar Event.summary 相当
  title text not null default '',
  -- 開始日（Asia/Tokyo など time_zone 上のカレンダー日）
  start_date date not null,
  -- 開始時刻 HH:MM（24h）。null の場合は終日扱い
  start_time text,
  -- 所要時間（分）。Google Calendar end 算出用
  duration_minutes integer not null default 60
    check (duration_minutes > 0 and duration_minutes <= 24 * 60),
  time_zone text not null default 'Asia/Tokyo',
  -- online | in_person | phone | other
  location_type text not null default 'online'
    check (location_type in ('online', 'in_person', 'phone', 'other')),
  -- Google Calendar Event.location 相当（URL・会場名など）
  location text not null default '',
  -- Google Calendar Event.description 相当
  description text not null default '',
  -- 将来の Google Calendar 同期用（未連携時は null）
  google_event_id text,
  google_calendar_id text,
  sync_status text not null default 'local'
    check (sync_status in ('local', 'pending', 'synced', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_appointments_start_time_format
    check (
      start_time is null
      or start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    )
);

create index if not exists client_appointments_client_start_idx
  on public.client_appointments (client_id, start_date asc, start_time asc nulls last);

create index if not exists client_appointments_owner_idx
  on public.client_appointments (owner_id);

create index if not exists client_appointments_google_event_idx
  on public.client_appointments (google_event_id)
  where google_event_id is not null;

comment on table public.client_appointments is
  'クライアント詳細の次回予定。Google Calendar Event 互換フィールドを持つ。';
comment on column public.client_appointments.title is
  '予定タイトル（GCal summary）。空の場合は description やデフォルト文言を表示。';
comment on column public.client_appointments.start_date is
  '開始日（time_zone 上のカレンダー日）。';
comment on column public.client_appointments.start_time is
  '開始時刻 HH:MM。null は終日。';
comment on column public.client_appointments.duration_minutes is
  '所要時間（分）。GCal end の算出に使用。';
comment on column public.client_appointments.location_type is
  'オンライン / 対面 / 電話 / その他。';
comment on column public.client_appointments.location is
  '場所・ミーティングURL（GCal location）。';
comment on column public.client_appointments.description is
  'メモ・詳細（GCal description）。';
comment on column public.client_appointments.google_event_id is
  '同期後の Google Calendar event id。';
comment on column public.client_appointments.sync_status is
  'local=未連携 / pending=同期待ち / synced=同期済 / error=失敗。';

drop trigger if exists client_appointments_set_updated_at
  on public.client_appointments;
create trigger client_appointments_set_updated_at
before update on public.client_appointments
for each row execute function public.set_updated_at();

alter table public.client_appointments enable row level security;

drop policy if exists "client_appointments_select_own"
  on public.client_appointments;
create policy "client_appointments_select_own"
  on public.client_appointments for select
  using (auth.uid() = owner_id);

drop policy if exists "client_appointments_insert_own"
  on public.client_appointments;
create policy "client_appointments_insert_own"
  on public.client_appointments for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "client_appointments_update_own"
  on public.client_appointments;
create policy "client_appointments_update_own"
  on public.client_appointments for update
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "client_appointments_delete_own"
  on public.client_appointments;
create policy "client_appointments_delete_own"
  on public.client_appointments for delete
  using (auth.uid() = owner_id);
