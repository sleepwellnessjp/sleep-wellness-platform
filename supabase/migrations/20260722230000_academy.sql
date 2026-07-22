-- ============================================================
-- Sleep Wellness Academy — 資格・学習進捗・テスト結果
-- Migration: 20260722230000_academy
-- ============================================================

create table if not exists public.academy_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users (id) on delete cascade,
  qualification_id text not null,
  acquired_at date not null,
  expires_at date not null,
  renewed_at date,
  certificate_number text not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academy_credentials_qualification_check
    check (
      qualification_id in (
        'navigator',
        'melatonin_yoga_instructor',
        'sleep_wellness_producer'
      )
    ),
  constraint academy_credentials_cert_number_not_blank
    check (btrim(certificate_number) <> ''),
  constraint academy_credentials_expires_gte_acquired
    check (expires_at >= acquired_at),
  constraint academy_credentials_user_qualification_unique
    unique (user_id, qualification_id),
  constraint academy_credentials_cert_number_unique
    unique (certificate_number)
);

create index if not exists academy_credentials_user_idx
  on public.academy_credentials (user_id, expires_at);

comment on table public.academy_credentials is
  'Academy 保有資格（認定証番号・取得日・有効期限・更新日）';

drop trigger if exists academy_credentials_set_updated_at
  on public.academy_credentials;
create trigger academy_credentials_set_updated_at
before update on public.academy_credentials
for each row execute function public.set_updated_at();

alter table public.academy_credentials enable row level security;

drop policy if exists "academy_credentials_select_own"
  on public.academy_credentials;
create policy "academy_credentials_select_own"
  on public.academy_credentials for select
  using (auth.uid() = user_id);

drop policy if exists "academy_credentials_insert_own"
  on public.academy_credentials;
create policy "academy_credentials_insert_own"
  on public.academy_credentials for insert
  with check (auth.uid() = user_id);

drop policy if exists "academy_credentials_update_own"
  on public.academy_credentials;
create policy "academy_credentials_update_own"
  on public.academy_credentials for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------

create table if not exists public.academy_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users (id) on delete cascade,
  lesson_id text not null,
  status text not null default 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academy_lesson_progress_status_check
    check (status in ('not_started', 'in_progress', 'completed')),
  constraint academy_lesson_progress_user_lesson_unique
    unique (user_id, lesson_id)
);

create index if not exists academy_lesson_progress_user_idx
  on public.academy_lesson_progress (user_id, status);

comment on table public.academy_lesson_progress is
  'Academy 各講義の受講状態（未受講 / 受講中 / 修了）';

drop trigger if exists academy_lesson_progress_set_updated_at
  on public.academy_lesson_progress;
create trigger academy_lesson_progress_set_updated_at
before update on public.academy_lesson_progress
for each row execute function public.set_updated_at();

alter table public.academy_lesson_progress enable row level security;

drop policy if exists "academy_lesson_progress_select_own"
  on public.academy_lesson_progress;
create policy "academy_lesson_progress_select_own"
  on public.academy_lesson_progress for select
  using (auth.uid() = user_id);

drop policy if exists "academy_lesson_progress_insert_own"
  on public.academy_lesson_progress;
create policy "academy_lesson_progress_insert_own"
  on public.academy_lesson_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "academy_lesson_progress_update_own"
  on public.academy_lesson_progress;
create policy "academy_lesson_progress_update_own"
  on public.academy_lesson_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------

create table if not exists public.academy_test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users (id) on delete cascade,
  test_id text not null,
  score integer not null default 0,
  max_score integer not null default 100,
  passed boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint academy_test_attempts_score_range
    check (score >= 0 and score <= 100),
  constraint academy_test_attempts_max_score_positive
    check (max_score > 0)
);

create index if not exists academy_test_attempts_user_idx
  on public.academy_test_attempts (user_id, test_id, submitted_at desc);

comment on table public.academy_test_attempts is
  'Academy テスト受験履歴（選択式・記述式）';

alter table public.academy_test_attempts enable row level security;

drop policy if exists "academy_test_attempts_select_own"
  on public.academy_test_attempts;
create policy "academy_test_attempts_select_own"
  on public.academy_test_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "academy_test_attempts_insert_own"
  on public.academy_test_attempts;
create policy "academy_test_attempts_insert_own"
  on public.academy_test_attempts for insert
  with check (auth.uid() = user_id);
