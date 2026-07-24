-- Migration: 20260724180000_sleep_wellness_journey
-- Sleep Wellness Journey™ — ステージ / 進捗 / アチーブメント

-- ------------------------------------------------------------
-- 1) journey_stages（マスター: 5 ステージ）
-- ------------------------------------------------------------
create table if not exists public.journey_stages (
  id text primary key,
  stage_number integer not null unique
    check (stage_number between 1 and 5),
  code text not null unique,
  title text not null,
  subtitle text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.journey_stages is
  'Sleep Wellness Journey™ の 5 ステージ定義（マスター）';

insert into public.journey_stages (id, stage_number, code, title, subtitle, description, sort_order)
values
  (
    'stage_1',
    1,
    'sleep_awareness',
    'Sleep Awareness',
    '自分の睡眠を知る',
    '初回分析を通じて、いまの睡眠の状態を客観的に把握するステージです。',
    1
  ),
  (
    'stage_2',
    2,
    'sleep_balance',
    'Sleep Balance',
    '生活リズムを整える',
    '就寝・起床時刻や日常習慣を整え、体内時計の土台をつくるステージです。',
    2
  ),
  (
    'stage_3',
    3,
    'sleep_recovery',
    'Sleep Recovery',
    '睡眠効率を高める',
    '深い休息と回復の質を高め、睡眠効率を安定させるステージです。',
    3
  ),
  (
    'stage_4',
    4,
    'sleep_performance',
    'Sleep Performance',
    '日中のパフォーマンス向上',
    '睡眠の質が日中の集中・気分・回復感につながるステージです。',
    4
  ),
  (
    'stage_5',
    5,
    'sleep_wellness',
    'Sleep Wellness',
    '睡眠が人生の土台になっている状態',
    '睡眠が日々のウェルネスの土台として定着した、Journey の到達点です。',
    5
  )
on conflict (id) do update set
  stage_number = excluded.stage_number,
  code = excluded.code,
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  sort_order = excluded.sort_order;

alter table public.journey_stages enable row level security;

drop policy if exists "journey_stages_select_authenticated"
  on public.journey_stages;
create policy "journey_stages_select_authenticated"
  on public.journey_stages for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- 2) achievement_master（バッジカタログ）
-- ------------------------------------------------------------
create table if not exists public.achievement_master (
  id text primary key,
  code text not null unique,
  title text not null,
  description text not null default '',
  category text not null default 'general'
    check (category in (
      'analysis',
      'streak',
      'metric',
      'practice',
      'general'
    )),
  icon_key text not null default 'star',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.achievement_master is
  'Sleep Wellness Journey™ アチーブメント（バッジ）マスター';

insert into public.achievement_master (
  id, code, title, description, category, icon_key, sort_order
)
values
  (
    'ach_first_analysis',
    'first_analysis',
    '初回分析',
    '初めての睡眠分析を完了しました',
    'analysis',
    'spark',
    1
  ),
  (
    'ach_streak_7',
    'streak_7',
    '7日継続',
    '宿題や実践を7日連続で続けました',
    'streak',
    'flame',
    2
  ),
  (
    'ach_streak_30',
    'streak_30',
    '30日継続',
    '宿題や実践を30日連続で続けました',
    'streak',
    'flame',
    3
  ),
  (
    'ach_efficiency_90',
    'efficiency_90',
    '睡眠効率90%以上',
    '睡眠効率が90%以上に達しました',
    'metric',
    'moon',
    4
  ),
  (
    'ach_hrv_improved',
    'hrv_improved',
    'HRV改善',
    'HRVが初回より改善しました',
    'metric',
    'pulse',
    5
  ),
  (
    'ach_stress_improved',
    'stress_improved',
    'ストレス改善',
    'ストレス指標が初回より改善しました',
    'metric',
    'leaf',
    6
  ),
  (
    'ach_melatonin_yoga',
    'melatonin_yoga_streak',
    'メラトニンヨガ™継続',
    'メラトニンヨガ™を継続して実践しています',
    'practice',
    'lotus',
    7
  )
on conflict (id) do update set
  code = excluded.code,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  icon_key = excluded.icon_key,
  sort_order = excluded.sort_order;

alter table public.achievement_master enable row level security;

drop policy if exists "achievement_master_select_authenticated"
  on public.achievement_master;
create policy "achievement_master_select_authenticated"
  on public.achievement_master for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- 3) journey_progress（クライアント別ステージ進捗）
-- ------------------------------------------------------------
create table if not exists public.journey_progress (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid
    references auth.users (id) on delete set null,
  current_stage_id text not null
    references public.journey_stages (id),
  stage_status text not null default 'current'
    check (stage_status in ('locked', 'current', 'completed')),
  achievement_rate integer not null default 0
    check (achievement_rate between 0 and 100),
  improvement_rate integer
    check (improvement_rate is null or improvement_rate between 0 and 100),
  streak_days integer not null default 0
    check (streak_days >= 0),
  next_goal text not null default '',
  score_trend jsonb not null default '[]'::jsonb,
  entered_at timestamptz,
  completed_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journey_progress_client_unique unique (client_id)
);

create index if not exists journey_progress_instructor_idx
  on public.journey_progress (instructor_id, updated_at desc);

create index if not exists journey_progress_stage_idx
  on public.journey_progress (current_stage_id);

comment on table public.journey_progress is
  'クライアントごとの Sleep Wellness Journey™ 進捗サマリー';

drop trigger if exists journey_progress_set_updated_at on public.journey_progress;
create trigger journey_progress_set_updated_at
before update on public.journey_progress
for each row execute function public.set_updated_at();

alter table public.journey_progress enable row level security;

drop policy if exists "journey_progress_select_linked_or_owner"
  on public.journey_progress;
create policy "journey_progress_select_linked_or_owner"
  on public.journey_progress for select
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

drop policy if exists "journey_progress_insert_instructor"
  on public.journey_progress;
create policy "journey_progress_insert_instructor"
  on public.journey_progress for insert
  to authenticated
  with check (
    public.is_admin_or_above()
    or instructor_id = auth.uid()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
    or public.is_linked_client(client_id)
  );

drop policy if exists "journey_progress_update_linked_or_owner"
  on public.journey_progress;
create policy "journey_progress_update_linked_or_owner"
  on public.journey_progress for update
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
-- 4) client_achievements（解除済みバッジ）
-- ------------------------------------------------------------
create table if not exists public.client_achievements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  achievement_id text not null
    references public.achievement_master (id),
  unlocked_at timestamptz not null default now(),
  source text not null default 'auto'
    check (source in ('auto', 'manual', 'demo')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint client_achievements_unique unique (client_id, achievement_id)
);

create index if not exists client_achievements_client_idx
  on public.client_achievements (client_id, unlocked_at desc);

comment on table public.client_achievements is
  'クライアントが解除した Sleep Wellness Journey™ アチーブメント';

alter table public.client_achievements enable row level security;

drop policy if exists "client_achievements_select_linked_or_owner"
  on public.client_achievements;
create policy "client_achievements_select_linked_or_owner"
  on public.client_achievements for select
  to authenticated
  using (
    public.is_linked_client(client_id)
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
    or public.is_admin_or_above()
  );

drop policy if exists "client_achievements_insert_linked_or_owner"
  on public.client_achievements;
create policy "client_achievements_insert_linked_or_owner"
  on public.client_achievements for insert
  to authenticated
  with check (
    public.is_linked_client(client_id)
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.instructor_id = auth.uid()
    )
    or public.is_admin_or_above()
  );

grant select on public.journey_stages to authenticated;
grant select on public.achievement_master to authenticated;
grant select, insert, update on public.journey_progress to authenticated;
grant select, insert on public.client_achievements to authenticated;
