-- ============================================================
-- glucose_readings — FreeStyle Libre CSV 血糖読み取り
-- Migration: 20260916130000_glucose_readings
-- ============================================================

create table if not exists public.glucose_readings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  owner_id uuid not null
    references auth.users (id) on delete cascade,
  recorded_at timestamptz not null,
  record_type integer not null,
  source text not null,
  glucose_mg_dl integer,
  device_name text,
  serial_number text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint glucose_readings_source_check
    check (source in ('historic', 'scan', 'strip', 'note', 'other')),
  constraint glucose_readings_client_time_type_unique
    unique (client_id, recorded_at, record_type)
);

create index if not exists glucose_readings_client_recorded_idx
  on public.glucose_readings (client_id, recorded_at asc);

create index if not exists glucose_readings_owner_idx
  on public.glucose_readings (owner_id);

comment on table public.glucose_readings is
  'FreeStyle Libre 等の血糖 CSV 取り込み。クライアント単位・時刻順。';
comment on column public.glucose_readings.recorded_at is
  '測定器タイムスタンプ（タイムゾーン付き）。';
comment on column public.glucose_readings.record_type is
  'Libre CSV の記録タイプ（0=履歴, 1=スキャン 等）。';
comment on column public.glucose_readings.source is
  '値の由来: historic / scan / strip / note / other。';
comment on column public.glucose_readings.glucose_mg_dl is
  '血糖値 mg/dL。ノート行などは NULL 可。';

drop trigger if exists glucose_readings_set_updated_at
  on public.glucose_readings;
create trigger glucose_readings_set_updated_at
before update on public.glucose_readings
for each row execute function public.set_updated_at();

alter table public.glucose_readings enable row level security;

drop policy if exists "glucose_readings_select_own"
  on public.glucose_readings;
create policy "glucose_readings_select_own"
  on public.glucose_readings for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "glucose_readings_insert_own"
  on public.glucose_readings;
create policy "glucose_readings_insert_own"
  on public.glucose_readings for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "glucose_readings_update_own"
  on public.glucose_readings;
create policy "glucose_readings_update_own"
  on public.glucose_readings for update
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "glucose_readings_delete_own"
  on public.glucose_readings;
create policy "glucose_readings_delete_own"
  on public.glucose_readings for delete
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

-- HQ admin（admin / super_admin）は全クライアント参照・取込可
drop policy if exists "glucose_readings_select_admin"
  on public.glucose_readings;
create policy "glucose_readings_select_admin"
  on public.glucose_readings for select
  using (public.is_admin_or_above());

drop policy if exists "glucose_readings_insert_admin"
  on public.glucose_readings;
create policy "glucose_readings_insert_admin"
  on public.glucose_readings for insert
  with check (public.is_admin_or_above());

drop policy if exists "glucose_readings_update_admin"
  on public.glucose_readings;
create policy "glucose_readings_update_admin"
  on public.glucose_readings for update
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "glucose_readings_delete_admin"
  on public.glucose_readings;
create policy "glucose_readings_delete_admin"
  on public.glucose_readings for delete
  using (public.is_admin_or_above());
