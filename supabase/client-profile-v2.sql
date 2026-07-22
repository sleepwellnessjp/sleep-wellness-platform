-- ============================================================
-- Client Profile V2 — fixed profiles + day context + weather
-- Migration: 20260722120000_client_profile_v2
--
-- Purpose:
--   - client_profiles: 固定プロフィール（クライアントごと・再利用）
--   - analyses.day_context: 分析日ごとの当日情報（固定と分離）
--   - weather_records: 対象日×地域の気象データ
--
-- clients 設計:
--   最小カラムのみ（id / instructor_id / name / name_kana / memo / created_at 等）。
--   年齢・性別・身長・体重・職業・健康情報は client_profiles へ保存する。
--   本 SQL は clients に存在しない旧プロフィール列（age / height_cm 等）を参照しない。
--
-- Safety / 冪等:
--   - 既存 clients / analyses 行は削除しない
--   - 新カラムはすべて nullable または default 付き
--   - create table / index / policy / column は IF NOT EXISTS または DROP IF EXISTS
--   - 既存 client_profiles がある場合は on conflict do nothing（上書きしない）
--   - 途中まで作成済みでも再実行可能
--
-- Rollback (手動・必要時のみ):
--   alter table public.analyses drop column if exists day_context;
--   drop table if exists public.weather_records;
--   drop table if exists public.client_profiles;
-- ============================================================

-- ------------------------------------------------------------
-- 1) client_profiles（1 client : 1 profile）
-- ------------------------------------------------------------
create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique
    references public.clients (id) on delete cascade,
  -- RLS 用に owner_id を冗長保持（clients.instructor_id と一致させる）
  owner_id uuid not null
    references auth.users (id) on delete cascade,
  -- 今後セクションが増えても移行できるようバージョン管理
  schema_version integer not null default 1
    check (schema_version >= 1),

  -- JSONB セクション（空オブジェクト可・未入力OK）
  basic jsonb not null default '{}'::jsonb,
  work jsonb not null default '{}'::jsonb,
  commute jsonb not null default '{}'::jsonb,
  heat_exposure jsonb not null default '{}'::jsonb,
  lifestyle jsonb not null default '{}'::jsonb,
  caffeine jsonb not null default '{}'::jsonb,
  hydration jsonb not null default '{}'::jsonb,
  exercise jsonb not null default '{}'::jsonb,
  health jsonb not null default '{}'::jsonb,
  sleep_environment jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_profiles_owner_id_idx
  on public.client_profiles (owner_id);

create index if not exists client_profiles_client_id_idx
  on public.client_profiles (client_id);

comment on table public.client_profiles is
  'クライアント固定プロフィール。分析日ごとの情報は analyses.day_context に保存する。';
comment on column public.client_profiles.schema_version is
  'JSONB スキーマ版。項目追加時に上げてアプリ側で移行する。';
comment on column public.client_profiles.basic is
  '基本情報: 氏名/生年月日/年齢/性別/身長cm/体重kg/BMI/居住・勤務地域';
comment on column public.client_profiles.work is
  '職業・勤務形態・身体的/環境的特徴（固定）';
comment on column public.client_profiles.commute is
  '通勤・移動（手段ごとの片道分など・固定）';
comment on column public.client_profiles.heat_exposure is
  '高温・高湿度環境への曝露（職業に依存しない固定項目）';
comment on column public.client_profiles.lifestyle is
  '生活習慣: 飲酒・喫煙など（当日分は day_context）';
comment on column public.client_profiles.caffeine is
  'カフェイン習慣（種類ごとの杯数等・固定）';
comment on column public.client_profiles.hydration is
  '水分摂取習慣（mL 単位・固定）';
comment on column public.client_profiles.exercise is
  '運動習慣（固定。当日運動は day_context）';
comment on column public.client_profiles.health is
  '健康・身体情報（機微情報）。RLS で owner のみ。';
comment on column public.client_profiles.sleep_environment is
  '睡眠習慣・自宅/寝室/仕事場の普段の環境（固定）';

drop trigger if exists client_profiles_set_updated_at on public.client_profiles;
create trigger client_profiles_set_updated_at
before update on public.client_profiles
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2) analyses.day_context（分析日ごとの当日情報）
-- ------------------------------------------------------------
alter table public.analyses
  add column if not exists day_context jsonb not null default '{}'::jsonb;

comment on column public.analyses.day_context is
  '分析日ごとの当日情報（飲酒・カフェイン・水分・運動・室温湿度・体調など）。固定プロフィールと混在させない。';

-- ------------------------------------------------------------
-- 3) weather_records（対象日 × 地域）
-- ------------------------------------------------------------
create table if not exists public.weather_records (
  id uuid primary key default gen_random_uuid(),
  -- 取得・保存した Instructor（自分のレコードのみ CRUD）
  owner_id uuid not null
    references auth.users (id) on delete cascade,

  target_date date not null,
  region text not null default '',
  latitude numeric,
  longitude numeric,

  temp_max_c numeric,
  temp_min_c numeric,
  humidity_percent numeric,
  pressure_hpa numeric,
  precipitation_mm numeric,
  weather_condition text not null default '',
  heat_index_c numeric,
  sunrise_time text not null default '',
  sunset_time text not null default '',

  source text not null default '',
  fetched_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (owner_id, target_date, region)
);

create index if not exists weather_records_owner_date_idx
  on public.weather_records (owner_id, target_date desc);

comment on table public.weather_records is
  '分析日・地域ごとの気象データ。原因断定には使わず影響の可能性として扱う。';
comment on column public.weather_records.temp_max_c is '最高気温 ℃';
comment on column public.weather_records.temp_min_c is '最低気温 ℃';
comment on column public.weather_records.humidity_percent is '湿度 %';
comment on column public.weather_records.pressure_hpa is '気圧 hPa';
comment on column public.weather_records.precipitation_mm is '降水量 mm';
comment on column public.weather_records.heat_index_c is '暑さ指数 ℃（または相当値）';
comment on column public.weather_records.source is '情報取得元（API名 / manual 等）';
comment on column public.weather_records.fetched_at is '取得日時';

drop trigger if exists weather_records_set_updated_at on public.weather_records;
create trigger weather_records_set_updated_at
before update on public.weather_records
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4) RLS — 認証ユーザーは自分のクライアント情報のみ
-- ------------------------------------------------------------
alter table public.client_profiles enable row level security;
alter table public.weather_records enable row level security;

-- client_profiles: owner_id = auth.uid()
drop policy if exists "client_profiles_select_own" on public.client_profiles;
create policy "client_profiles_select_own"
  on public.client_profiles for select
  using (auth.uid() = owner_id);

drop policy if exists "client_profiles_insert_own" on public.client_profiles;
create policy "client_profiles_insert_own"
  on public.client_profiles for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "client_profiles_update_own" on public.client_profiles;
create policy "client_profiles_update_own"
  on public.client_profiles for update
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "client_profiles_delete_own" on public.client_profiles;
create policy "client_profiles_delete_own"
  on public.client_profiles for delete
  using (auth.uid() = owner_id);

-- weather_records: owner_id = auth.uid()
drop policy if exists "weather_records_select_own" on public.weather_records;
create policy "weather_records_select_own"
  on public.weather_records for select
  using (auth.uid() = owner_id);

drop policy if exists "weather_records_insert_own" on public.weather_records;
create policy "weather_records_insert_own"
  on public.weather_records for insert
  with check (auth.uid() = owner_id);

drop policy if exists "weather_records_update_own" on public.weather_records;
create policy "weather_records_update_own"
  on public.weather_records for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "weather_records_delete_own" on public.weather_records;
create policy "weather_records_delete_own"
  on public.weather_records for delete
  using (auth.uid() = owner_id);

-- analyses.day_context は既存 analyses RLS（owner_id）で保護される

-- ------------------------------------------------------------
-- 5) 既存 clients からの安全な初期バックフィル（任意・非破壊）
--    clients は最小カラムのみ参照（id / instructor_id / name）。
--    age / gender / height_cm / weight_kg / medications 等は参照しない。
--    不足プロフィール項目はテーブル default（{}）で初期化。
--    既に profile がある場合は触らない（create_client_with_profile と整合）。
-- ------------------------------------------------------------
insert into public.client_profiles (
  client_id,
  owner_id,
  schema_version,
  basic
)
select
  c.id,
  c.instructor_id,
  1,
  jsonb_build_object('fullName', c.name)
from public.clients c
on conflict (client_id) do nothing;
