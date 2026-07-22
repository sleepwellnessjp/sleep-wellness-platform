-- ============================================================
-- Occupation / Environment Event masters + Personal baselines
-- Migration: 20260722140000_occupation_environment_baselines
--
-- Design:
--   1) occupation_master
--      「職業名」ではなく勤務環境属性（高温・立ち仕事・夜勤・PC作業等）の
--      マスター。AI が参照する ai_context / sleep_relevance を持つ。
--
--   2) environment_event_master + analysis_environment_events
--      旅行・ホテル・飛行機・新幹線・出張・キャンプ等の環境イベントを
--      マスター＋分析日紐づけで拡張可能にする（payload jsonb）。
--
--   3) client_metric_baselines + analyses.personal_baseline
--      一般基準より「本人の過去30日・90日平均」を優先評価できる構造。
--      分析時点のスナップショットを analyses.personal_baseline に保存可能。
--
-- Safety:
--   - 既存行は削除しない
--   - 新カラムは nullable / default 付き
--   - マスターは on conflict do update で再実行可能
-- ============================================================

-- ------------------------------------------------------------
-- 1) occupation_master（勤務環境属性マスター）
-- ------------------------------------------------------------
create table if not exists public.occupation_master (
  id text primary key,
  label text not null,
  -- thermal | posture | schedule | digital | physical | sensory | recovery | other
  category text not null default 'other'
    check (category in (
      'thermal',
      'posture',
      'schedule',
      'digital',
      'physical',
      'sensory',
      'recovery',
      'other'
    )),
  description text not null default '',
  -- AI 分析プロンプトに渡す文脈（一般論ではなく属性に紐づく観点）
  ai_context text not null default '',
  -- 睡眠関連タグ（例: heat_load, circadian, recovery, screen）
  sleep_relevance text[] not null default '{}',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  schema_version integer not null default 1 check (schema_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists occupation_master_category_idx
  on public.occupation_master (category, sort_order)
  where is_active;

comment on table public.occupation_master is
  '勤務環境属性マスター（職業名ではなく、高温・立ち仕事・夜勤・PC作業など）。AI参照用。';
comment on column public.occupation_master.ai_context is
  'AI分析で参照する属性固有の観点。一般基準の羅列ではなく睡眠影響の可能性を示す。';
comment on column public.occupation_master.sleep_relevance is
  '睡眠影響タグ。拡張時は配列に追加する。';

drop trigger if exists occupation_master_set_updated_at on public.occupation_master;
create trigger occupation_master_set_updated_at
before update on public.occupation_master
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2) client_occupation_attributes（固定プロフィール ↔ 属性）
-- ------------------------------------------------------------
create table if not exists public.client_occupation_attributes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  owner_id uuid not null
    references auth.users (id) on delete cascade,
  attribute_id text not null
    references public.occupation_master (id) on delete restrict,
  -- mild | moderate | high | unknown
  intensity text not null default 'unknown'
    check (intensity in ('mild', 'moderate', 'high', 'unknown')),
  notes text not null default '',
  -- 将来の属性固有パラメータ（曝露時間・頻度など）
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, attribute_id)
);

create index if not exists client_occupation_attributes_client_idx
  on public.client_occupation_attributes (client_id);

create index if not exists client_occupation_attributes_owner_idx
  on public.client_occupation_attributes (owner_id);

comment on table public.client_occupation_attributes is
  'クライアント固定の勤務環境属性。client_profiles.work の補完・正規化レイヤ。';

drop trigger if exists client_occupation_attributes_set_updated_at
  on public.client_occupation_attributes;
create trigger client_occupation_attributes_set_updated_at
before update on public.client_occupation_attributes
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3) environment_event_master（環境イベントマスター）
-- ------------------------------------------------------------
create table if not exists public.environment_event_master (
  id text primary key,
  label text not null,
  -- travel | lodging | transport | outdoor | work | other
  category text not null default 'other'
    check (category in (
      'travel',
      'lodging',
      'transport',
      'outdoor',
      'work',
      'other'
    )),
  description text not null default '',
  ai_context text not null default '',
  sleep_relevance text[] not null default '{}',
  -- 推奨ペイロードキーのヒント（UI/AI向け・強制しない）
  payload_schema jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  schema_version integer not null default 1 check (schema_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists environment_event_master_category_idx
  on public.environment_event_master (category, sort_order)
  where is_active;

comment on table public.environment_event_master is
  '環境イベントマスター（旅行・ホテル・飛行機・新幹線・出張・キャンプ等）。将来追加可能。';
comment on column public.environment_event_master.payload_schema is
  '推奨 payload キーのヒント（例: {"keys":["destination","durationHours"]}）。厳密バリデーションはアプリ側。';

drop trigger if exists environment_event_master_set_updated_at
  on public.environment_event_master;
create trigger environment_event_master_set_updated_at
before update on public.environment_event_master
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4) analysis_environment_events（分析日ごとの環境イベント）
-- ------------------------------------------------------------
create table if not exists public.analysis_environment_events (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null
    references public.analyses (id) on delete cascade,
  client_id uuid not null
    references public.clients (id) on delete cascade,
  owner_id uuid not null
    references auth.users (id) on delete cascade,
  event_type_id text not null
    references public.environment_event_master (id) on delete restrict,
  event_date date,
  started_at timestamptz,
  ended_at timestamptz,
  notes text not null default '',
  -- 目的地・宿泊数・移動時間など拡張フィールド
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analysis_environment_events_analysis_idx
  on public.analysis_environment_events (analysis_id);

create index if not exists analysis_environment_events_client_date_idx
  on public.analysis_environment_events (client_id, event_date desc nulls last);

create index if not exists analysis_environment_events_owner_idx
  on public.analysis_environment_events (owner_id);

comment on table public.analysis_environment_events is
  '分析に紐づく環境イベント実体。マスター参照 + payload で拡張。day_context との二重保存可。';

drop trigger if exists analysis_environment_events_set_updated_at
  on public.analysis_environment_events;
create trigger analysis_environment_events_set_updated_at
before update on public.analysis_environment_events
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 5) client_metric_baselines（本人 30/90 日平均）
-- ------------------------------------------------------------
create table if not exists public.client_metric_baselines (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  owner_id uuid not null
    references auth.users (id) on delete cascade,
  window_days integer not null
    check (window_days in (30, 90)),
  as_of_date date not null,
  metric_key text not null,
  sample_count integer not null default 0 check (sample_count >= 0),
  avg_value numeric,
  median_value numeric,
  min_value numeric,
  max_value numeric,
  stddev_value numeric,
  unit text not null default '',
  -- analyses | manual | import
  source text not null default 'analyses',
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, window_days, as_of_date, metric_key)
);

create index if not exists client_metric_baselines_lookup_idx
  on public.client_metric_baselines (client_id, as_of_date desc, window_days);

comment on table public.client_metric_baselines is
  '本人の過去30日・90日メトリクス平均。AIは一般基準よりこちらを優先して評価する。';
comment on column public.client_metric_baselines.metric_key is
  '例: sleep_score, sleep_duration_min, sleep_efficiency, hrv, spo2, resting_heart_rate, stress';
comment on column public.client_metric_baselines.as_of_date is
  '基準日（通常は分析日）。この日より前の window_days 日分から算出。';

drop trigger if exists client_metric_baselines_set_updated_at
  on public.client_metric_baselines;
create trigger client_metric_baselines_set_updated_at
before update on public.client_metric_baselines
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 6) analyses.personal_baseline（分析時点スナップショット）
-- ------------------------------------------------------------
alter table public.analyses
  add column if not exists personal_baseline jsonb not null default '{}'::jsonb;

comment on column public.analyses.personal_baseline is
  '分析時点の本人ベースライン（30d/90d）スナップショット。再計算後も当時評価を再現可能。';

-- day_context に環境イベント要約を持てる旨をコメント更新
comment on column public.analyses.day_context is
  '分析日ごとの当日情報。environmentEvents[] で環境イベント要約を持てる。正規化実体は analysis_environment_events。';

comment on column public.client_profiles.work is
  '勤務情報。環境属性の正規化は client_occupation_attributes + occupation_master を優先。';

-- ------------------------------------------------------------
-- 7) Seed: occupation_master
-- ------------------------------------------------------------
insert into public.occupation_master (
  id, label, category, description, ai_context, sleep_relevance, sort_order
) values
  ('high_heat', '高温環境', 'thermal',
   '厨房・屋外・炉など高温下での勤務',
   '体温・皮膚温・水分・入眠前のクールダウンとの関連を可能性として検討する。',
   array['heat_load','recovery','hydration'], 10),
  ('high_humidity', '高湿度環境', 'thermal',
   '湿度の高い職場環境',
   '発汗・水分・寝室湿度との組み合わせで睡眠効率への影響可能性を見る。',
   array['heat_load','hydration'], 20),
  ('low_temperature', '低温環境', 'thermal',
   '低温・冷蔵・屋外寒冷環境',
   '体温調節・入眠潜時・皮膚温との関係を可能性として述べる。',
   array['thermal','sleep_onset'], 30),
  ('radiant_heat', '強い輻射熱', 'thermal',
   '火・炉・オーブン近傍など',
   '勤務後の体温低下時間と入眠の間隔に着目する。',
   array['heat_load','recovery'], 40),
  ('standing_work', '立ち仕事', 'posture',
   '長時間の立位作業',
   '下肢負担・回復・深い睡眠との関係を可能性として検討する。',
   array['physical_load','recovery'], 50),
  ('sitting_work', '座り仕事', 'posture',
   '長時間の座位作業',
   '活動量不足・日中活動と睡眠圧の関係に触れる（断定しない）。',
   array['sedentary','circadian'], 60),
  ('walking_work', '歩く仕事', 'physical',
   '歩行中心の業務',
   '活動量と入眠・深い睡眠のバランスを見る。',
   array['physical_load'], 70),
  ('heavy_lifting', '重い物を持つ', 'physical',
   '重量物の取扱い',
   '筋疲労・回復指標（HRV等）との関係を可能性として述べる。',
   array['physical_load','recovery'], 80),
  ('high_activity', '身体活動量が多い', 'physical',
   '身体負荷の大きい業務',
   '運動終了時刻と入眠間隔・回復を優先して評価する。',
   array['physical_load','recovery'], 90),
  ('low_activity', '身体活動量が少ない', 'physical',
   '身体負荷の小さい業務',
   '日中の活動不足が睡眠圧に与える可能性に触れる。',
   array['sedentary','circadian'], 100),
  ('night_shift', '夜勤', 'schedule',
   '夜間帯の勤務',
   '体内時計・入眠/起床の位相ずれを本人平均と比較しつつ優先評価する。',
   array['circadian','schedule'], 110),
  ('early_shift', '早朝勤務', 'schedule',
   '早朝帯の勤務',
   '起床時刻の前倒しと睡眠負債・効率の関係を見る。',
   array['circadian','schedule'], 120),
  ('irregular_shift', '不規則勤務', 'schedule',
   'シフト・交代が不規則',
   '単日で結論せず、本人30/90日のばらつきと合わせて述べる。',
   array['circadian','schedule'], 130),
  ('pc_work', 'PC作業', 'digital',
   '長時間のパソコン作業',
   '就寝前のスクリーン・眼精疲労・入眠潜時の可能性に触れる。',
   array['screen','sleep_onset'], 140),
  ('smartphone_work', 'スマートフォン作業', 'digital',
   '業務でのスマホ多用',
   '就寝前の光刺激・認知的覚醒の可能性を述べる。',
   array['screen','sleep_onset'], 150),
  ('long_driving', '長時間運転', 'physical',
   '運転中心の業務',
   '座位・緊張・帰宅後の切り替え時間と入眠の関係を見る。',
   array['physical_load','stress'], 160),
  ('noise_environment', '騒音環境', 'sensory',
   '騒音の多い職場',
   'ストレス・覚醒・回復指標との関係を可能性として述べる。',
   array['stress','sensory'], 170),
  ('outdoor_work', '屋外勤務', 'thermal',
   '屋外中心の勤務',
   '気温・日照・疲労と本人ベースラインの差分を優先する。',
   array['thermal','circadian'], 180),
  ('dust_smoke', '粉塵・煙の多い環境', 'sensory',
   '粉塵・煙への曝露',
   '呼吸・SpO₂・いびき等がある場合のみ可能性として穏やかに触れる。',
   array['respiration','sensory'], 190),
  ('hard_to_break', '休憩が取りにくい', 'recovery',
   '休憩取得が困難な勤務',
   '回復不足・ストレス・睡眠効率の関係を可能性として述べる。',
   array['recovery','stress'], 200),
  ('move_immediately_after', '勤務終了後すぐに移動', 'recovery',
   'クールダウンなしで移動する習慣',
   '体温低下・切り替え不足と入眠潜時の関係を検討する。',
   array['recovery','sleep_onset'], 210),
  ('interpersonal_heavy', '対人対応が多い', 'sensory',
   '接客・対人負荷の高い業務',
   '主観ストレスと測定ストレスを分け、本人平均との差を見る。',
   array['stress'], 220),
  ('high_concentration', '強い集中を必要とする', 'digital',
   '高い認知負荷の業務',
   '認知的覚醒・入眠前の切り替えの必要性に触れる。',
   array['stress','sleep_onset'], 230)
on conflict (id) do update set
  label = excluded.label,
  category = excluded.category,
  description = excluded.description,
  ai_context = excluded.ai_context,
  sleep_relevance = excluded.sleep_relevance,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- ------------------------------------------------------------
-- 8) Seed: environment_event_master
-- ------------------------------------------------------------
insert into public.environment_event_master (
  id, label, category, description, ai_context, sleep_relevance, payload_schema, sort_order
) values
  ('travel', '旅行', 'travel',
   '旅行全般',
   '時差・環境変化・就寝環境の変化を本人平均と比較し、単日の例外として扱う。',
   array['circadian','environment_change'],
   '{"keys":["destination","nights","timezoneOffsetHours"]}'::jsonb, 10),
  ('hotel_stay', 'ホテル宿泊', 'lodging',
   'ホテル・旅館等の宿泊',
   '普段と異なる寝室環境として睡眠効率・覚醒を可能性評価する。',
   array['environment_change','sleep_efficiency'],
   '{"keys":["nights","roomType","noiseLevel"]}'::jsonb, 20),
  ('flight', '飛行機', 'transport',
   '航空機移動',
   '時差・座位・乾燥・到着時刻と入眠の関係を可能性として述べる。',
   array['circadian','transport'],
   '{"keys":["durationHours","timezoneOffsetHours","cabinClass"]}'::jsonb, 30),
  ('shinkansen', '新幹線', 'transport',
   '新幹線移動',
   '移動疲労・到着時刻・就寝時刻のずれを本人平均と比較する。',
   array['transport','fatigue'],
   '{"keys":["durationHours","direction"]}'::jsonb, 40),
  ('other_train', '電車移動（長距離）', 'transport',
   '長距離電車移動',
   '移動負荷と就寝環境変化の可能性に触れる。',
   array['transport','fatigue'],
   '{"keys":["durationHours"]}'::jsonb, 50),
  ('business_trip', '出張', 'work',
   '業務出張',
   '勤務負荷＋宿泊環境の複合要因として、本人30/90日平均との差分を優先する。',
   array['schedule','environment_change','stress'],
   '{"keys":["nights","destination","meetingLoad"]}'::jsonb, 60),
  ('camping', 'キャンプ', 'outdoor',
   'キャンプ・野外泊',
   '光・温度・寝具の変化と睡眠ステージの関係を可能性として述べる。',
   array['outdoor','environment_change'],
   '{"keys":["nights","temperatureBand"]}'::jsonb, 70),
  ('other_lodging', 'その他の宿泊', 'lodging',
   'ホームステイ・車中泊など',
   '普段と異なる睡眠環境として例外日扱いにする。',
   array['environment_change'],
   '{"keys":["nights","lodgingType"]}'::jsonb, 80),
  ('late_return', '遠方からの帰宅遅れ', 'transport',
   '帰宅が大幅に遅れた日',
   '入眠時刻の後退と睡眠時間・負債を本人平均と比較する。',
   array['schedule','sleep_debt'],
   '{"keys":["returnTime"]}'::jsonb, 90)
on conflict (id) do update set
  label = excluded.label,
  category = excluded.category,
  description = excluded.description,
  ai_context = excluded.ai_context,
  sleep_relevance = excluded.sleep_relevance,
  payload_schema = excluded.payload_schema,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- ------------------------------------------------------------
-- 9) RLS
-- ------------------------------------------------------------
alter table public.occupation_master enable row level security;
alter table public.environment_event_master enable row level security;
alter table public.client_occupation_attributes enable row level security;
alter table public.analysis_environment_events enable row level security;
alter table public.client_metric_baselines enable row level security;

-- マスターは認証ユーザーが参照可能（書き込みは service role / 将来 Admin）
drop policy if exists "occupation_master_select_authenticated" on public.occupation_master;
create policy "occupation_master_select_authenticated"
  on public.occupation_master for select
  to authenticated
  using (is_active = true);

drop policy if exists "environment_event_master_select_authenticated"
  on public.environment_event_master;
create policy "environment_event_master_select_authenticated"
  on public.environment_event_master for select
  to authenticated
  using (is_active = true);

-- client_occupation_attributes
drop policy if exists "client_occupation_attributes_select_own"
  on public.client_occupation_attributes;
create policy "client_occupation_attributes_select_own"
  on public.client_occupation_attributes for select
  using (auth.uid() = owner_id);

drop policy if exists "client_occupation_attributes_insert_own"
  on public.client_occupation_attributes;
create policy "client_occupation_attributes_insert_own"
  on public.client_occupation_attributes for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "client_occupation_attributes_update_own"
  on public.client_occupation_attributes;
create policy "client_occupation_attributes_update_own"
  on public.client_occupation_attributes for update
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "client_occupation_attributes_delete_own"
  on public.client_occupation_attributes;
create policy "client_occupation_attributes_delete_own"
  on public.client_occupation_attributes for delete
  using (auth.uid() = owner_id);

-- analysis_environment_events
drop policy if exists "analysis_environment_events_select_own"
  on public.analysis_environment_events;
create policy "analysis_environment_events_select_own"
  on public.analysis_environment_events for select
  using (auth.uid() = owner_id);

drop policy if exists "analysis_environment_events_insert_own"
  on public.analysis_environment_events;
create policy "analysis_environment_events_insert_own"
  on public.analysis_environment_events for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.analyses a
      where a.id = analysis_id and a.owner_id = auth.uid()
    )
  );

drop policy if exists "analysis_environment_events_update_own"
  on public.analysis_environment_events;
create policy "analysis_environment_events_update_own"
  on public.analysis_environment_events for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "analysis_environment_events_delete_own"
  on public.analysis_environment_events;
create policy "analysis_environment_events_delete_own"
  on public.analysis_environment_events for delete
  using (auth.uid() = owner_id);

-- client_metric_baselines
drop policy if exists "client_metric_baselines_select_own"
  on public.client_metric_baselines;
create policy "client_metric_baselines_select_own"
  on public.client_metric_baselines for select
  using (auth.uid() = owner_id);

drop policy if exists "client_metric_baselines_insert_own"
  on public.client_metric_baselines;
create policy "client_metric_baselines_insert_own"
  on public.client_metric_baselines for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "client_metric_baselines_update_own"
  on public.client_metric_baselines;
create policy "client_metric_baselines_update_own"
  on public.client_metric_baselines for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "client_metric_baselines_delete_own"
  on public.client_metric_baselines;
create policy "client_metric_baselines_delete_own"
  on public.client_metric_baselines for delete
  using (auth.uid() = owner_id);
