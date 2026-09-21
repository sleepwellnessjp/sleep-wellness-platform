-- ============================================================
-- glucose_readings — HQ admin が全クライアントを参照・取込できる
-- Migration: 20260921100000_glucose_readings_admin_access
-- 講師向け RLS（担当のみ）は維持。admin / super_admin を追加。
-- ============================================================

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
