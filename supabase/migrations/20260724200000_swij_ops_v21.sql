-- Migration: 20260724200000_swij_ops_v21
-- Sleep Wellness Institute Japan — Version 2.1 運営システム
-- 認定校 / 認定講師 / 認定レベル / 講座・受講 / 本部通知

-- ============================================================
-- certification_levels（認定レベルマスタ）
-- ============================================================
create table if not exists public.certification_levels (
  id text primary key,
  label text not null,
  label_en text not null default '',
  sort_order integer not null default 0,
  description text not null default '',
  renewal_months integer not null default 12,
  ce_hours_required integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists certification_levels_set_updated_at on public.certification_levels;
create trigger certification_levels_set_updated_at
before update on public.certification_levels
for each row execute function public.set_updated_at();

alter table public.certification_levels enable row level security;

drop policy if exists "certification_levels_select_authenticated" on public.certification_levels;
create policy "certification_levels_select_authenticated"
  on public.certification_levels for select
  to authenticated
  using (true);

drop policy if exists "certification_levels_admin_all" on public.certification_levels;
create policy "certification_levels_admin_all"
  on public.certification_levels for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

insert into public.certification_levels (id, label, label_en, sort_order, description, renewal_months, ce_hours_required)
values
  ('foundation', 'Foundation', 'Foundation', 10, '睡眠ウェルネス基礎認定', 12, 4),
  ('practitioner', 'Practitioner', 'Practitioner', 20, '実践者認定', 12, 8),
  ('instructor', 'Instructor', 'Instructor', 30, '認定講師', 12, 12),
  ('navigator', 'Navigator', 'Navigator', 40, 'スリープウェルネス・ナビゲーター', 12, 16),
  ('producer', 'Producer', 'Producer', 50, 'スリープウェルネス・プロデューサー', 24, 20)
on conflict (id) do nothing;

-- ============================================================
-- certified_schools（認定校）
-- ============================================================
create table if not exists public.certified_schools (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  name_kana text not null default '',
  region text not null default '',
  prefecture text not null default '',
  address text not null default '',
  representative_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  status text not null default 'active',
  certified_at date not null default (current_date),
  admin_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certified_schools_code_unique unique (code),
  constraint certified_schools_status_check
    check (status in ('active', 'suspended', 'closed'))
);

create index if not exists certified_schools_status_idx
  on public.certified_schools (status, updated_at desc);

create index if not exists certified_schools_region_idx
  on public.certified_schools (region, prefecture);

drop trigger if exists certified_schools_set_updated_at on public.certified_schools;
create trigger certified_schools_set_updated_at
before update on public.certified_schools
for each row execute function public.set_updated_at();

alter table public.certified_schools enable row level security;

drop policy if exists "certified_schools_select_authenticated" on public.certified_schools;
create policy "certified_schools_select_authenticated"
  on public.certified_schools for select
  to authenticated
  using (true);

drop policy if exists "certified_schools_admin_all" on public.certified_schools;
create policy "certified_schools_admin_all"
  on public.certified_schools for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

comment on table public.certified_schools is
  'SWIJ 認定校（本部運営）';

-- ============================================================
-- certified_instructors（認定講師運営レコード）
-- ============================================================
create table if not exists public.certified_instructors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid references public.certified_schools (id) on delete set null,
  level_id text not null references public.certification_levels (id),
  instructor_number text not null,
  display_name text not null default '',
  email text not null default '',
  status text not null default 'active',
  certified_at date not null,
  renews_at date not null,
  suspended_at timestamptz,
  withdrawn_at timestamptz,
  last_renewed_at date,
  status_history jsonb not null default '[]'::jsonb,
  admin_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certified_instructors_number_unique unique (instructor_number),
  constraint certified_instructors_user_unique unique (user_id),
  constraint certified_instructors_status_check
    check (
      status in (
        'active',
        'renewal_pending',
        'suspended',
        'withdrawn',
        'expired'
      )
    )
);

create index if not exists certified_instructors_school_idx
  on public.certified_instructors (school_id, status);

create index if not exists certified_instructors_status_idx
  on public.certified_instructors (status, renews_at);

create index if not exists certified_instructors_level_idx
  on public.certified_instructors (level_id, status);

drop trigger if exists certified_instructors_set_updated_at on public.certified_instructors;
create trigger certified_instructors_set_updated_at
before update on public.certified_instructors
for each row execute function public.set_updated_at();

alter table public.certified_instructors enable row level security;

drop policy if exists "certified_instructors_select_own_or_admin" on public.certified_instructors;
create policy "certified_instructors_select_own_or_admin"
  on public.certified_instructors for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_above());

drop policy if exists "certified_instructors_admin_all" on public.certified_instructors;
create policy "certified_instructors_admin_all"
  on public.certified_instructors for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

comment on table public.certified_instructors is
  'SWIJ 認定講師運営管理（更新・停止・退会）';

-- ============================================================
-- school_courses（認定校・開催講座）
-- ============================================================
create table if not exists public.school_courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.certified_schools (id) on delete cascade,
  title text not null,
  course_type text not null default 'certification',
  level_id text references public.certification_levels (id),
  starts_on date,
  ends_on date,
  capacity integer not null default 0,
  enrolled_count integer not null default 0,
  completed_count integer not null default 0,
  status text not null default 'scheduled',
  instructor_id uuid references public.certified_instructors (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_courses_type_check
    check (course_type in ('certification', 'workshop', 'ce', 'open')),
  constraint school_courses_status_check
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

create index if not exists school_courses_school_idx
  on public.school_courses (school_id, starts_on desc);

drop trigger if exists school_courses_set_updated_at on public.school_courses;
create trigger school_courses_set_updated_at
before update on public.school_courses
for each row execute function public.set_updated_at();

alter table public.school_courses enable row level security;

drop policy if exists "school_courses_select_authenticated" on public.school_courses;
create policy "school_courses_select_authenticated"
  on public.school_courses for select
  to authenticated
  using (true);

drop policy if exists "school_courses_admin_all" on public.school_courses;
create policy "school_courses_admin_all"
  on public.school_courses for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ============================================================
-- school_students（認定校・受講生）
-- ============================================================
create table if not exists public.school_students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.certified_schools (id) on delete cascade,
  course_id uuid references public.school_courses (id) on delete set null,
  display_name text not null,
  email text not null default '',
  status text not null default 'enrolled',
  enrolled_at date not null default (current_date),
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_students_status_check
    check (status in ('enrolled', 'completed', 'dropped', 'deferred'))
);

create index if not exists school_students_school_idx
  on public.school_students (school_id, status);

drop trigger if exists school_students_set_updated_at on public.school_students;
create trigger school_students_set_updated_at
before update on public.school_students
for each row execute function public.set_updated_at();

alter table public.school_students enable row level security;

drop policy if exists "school_students_select_admin" on public.school_students;
create policy "school_students_select_admin"
  on public.school_students for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "school_students_admin_all" on public.school_students;
create policy "school_students_admin_all"
  on public.school_students for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ============================================================
-- ops_notifications（運営通知センター）
-- ============================================================
create table if not exists public.ops_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  audience text not null default 'all_instructors',
  title text not null,
  body text not null default '',
  href text,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  is_pinned boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ops_notifications_kind_check
    check (
      kind in (
        'hq_announcement',
        'certification_renewal',
        'event',
        'material_update',
        'ai_notice'
      )
    ),
  constraint ops_notifications_audience_check
    check (
      audience in (
        'all',
        'all_instructors',
        'all_admins',
        'school',
        'instructor'
      )
    )
);

create index if not exists ops_notifications_published_idx
  on public.ops_notifications (published_at desc);

create index if not exists ops_notifications_kind_idx
  on public.ops_notifications (kind, published_at desc);

drop trigger if exists ops_notifications_set_updated_at on public.ops_notifications;
create trigger ops_notifications_set_updated_at
before update on public.ops_notifications
for each row execute function public.set_updated_at();

alter table public.ops_notifications enable row level security;

drop policy if exists "ops_notifications_select_authenticated" on public.ops_notifications;
create policy "ops_notifications_select_authenticated"
  on public.ops_notifications for select
  to authenticated
  using (true);

drop policy if exists "ops_notifications_admin_all" on public.ops_notifications;
create policy "ops_notifications_admin_all"
  on public.ops_notifications for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ============================================================
-- ops_events（本部イベント集計用）
-- ============================================================
create table if not exists public.ops_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'seminar',
  region text not null default '全国',
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer not null default 0,
  registered_count integer not null default 0,
  status text not null default 'scheduled',
  school_id uuid references public.certified_schools (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ops_events_type_check
    check (event_type in ('seminar', 'workshop', 'webinar', 'ceremony', 'other')),
  constraint ops_events_status_check
    check (status in ('scheduled', 'open', 'closed', 'cancelled', 'completed'))
);

create index if not exists ops_events_starts_idx
  on public.ops_events (starts_at desc);

drop trigger if exists ops_events_set_updated_at on public.ops_events;
create trigger ops_events_set_updated_at
before update on public.ops_events
for each row execute function public.set_updated_at();

alter table public.ops_events enable row level security;

drop policy if exists "ops_events_select_authenticated" on public.ops_events;
create policy "ops_events_select_authenticated"
  on public.ops_events for select
  to authenticated
  using (true);

drop policy if exists "ops_events_admin_all" on public.ops_events;
create policy "ops_events_admin_all"
  on public.ops_events for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

comment on table public.ops_events is
  'SWIJ 本部・認定校イベント（本部ダッシュボード集計）';
