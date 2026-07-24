-- βテスト フィードバック（手動適用用・migration と同一）
-- Migration: 20260724120000_beta_feedback

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text,
  user_display_name text,
  category text not null,
  target_screen text not null,
  severity text not null default 'medium',
  content text not null,
  reproduction_steps text not null default '',
  device text not null default '',
  browser text not null default '',
  current_url text not null default '',
  screen_name text not null default '',
  device_type text not null default '',
  browser_info text not null default '',
  app_version text not null default '',
  status text not null default 'unconfirmed',
  admin_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_feedback_category_check
    check (
      category in (
        'bug',
        'improvement',
        'confusing',
        'feature_request',
        'positive',
        'other'
      )
    ),
  constraint beta_feedback_target_screen_check
    check (
      target_screen in (
        'dashboard',
        'clients',
        'analysis',
        'report',
        'journey',
        'homework',
        'follow_up',
        'ai_assistant',
        'demo_mode',
        'other'
      )
    ),
  constraint beta_feedback_severity_check
    check (severity in ('low', 'medium', 'high', 'urgent')),
  constraint beta_feedback_status_check
    check (
      status in (
        'unconfirmed',
        'reviewing',
        'planned',
        'resolved',
        'on_hold'
      )
    ),
  constraint beta_feedback_device_type_check
    check (
      device_type = ''
      or device_type in ('pc', 'mobile', 'tablet')
    ),
  constraint beta_feedback_content_not_blank
    check (length(trim(content)) > 0)
);

create index if not exists beta_feedback_created_idx
  on public.beta_feedback (created_at desc);

create index if not exists beta_feedback_user_created_idx
  on public.beta_feedback (user_id, created_at desc);

create index if not exists beta_feedback_category_idx
  on public.beta_feedback (category, created_at desc);

create index if not exists beta_feedback_severity_idx
  on public.beta_feedback (severity, created_at desc);

create index if not exists beta_feedback_status_idx
  on public.beta_feedback (status, created_at desc);

comment on table public.beta_feedback is
  'βテスト フィードバック（認定講師からの不具合・改善要望など）';

drop trigger if exists beta_feedback_set_updated_at on public.beta_feedback;
create trigger beta_feedback_set_updated_at
before update on public.beta_feedback
for each row execute function public.set_updated_at();

alter table public.beta_feedback enable row level security;

drop policy if exists "beta_feedback_select_own_or_admin"
  on public.beta_feedback;
create policy "beta_feedback_select_own_or_admin"
  on public.beta_feedback for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "beta_feedback_insert_own"
  on public.beta_feedback;
create policy "beta_feedback_insert_own"
  on public.beta_feedback for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

drop policy if exists "beta_feedback_update_admin"
  on public.beta_feedback;
create policy "beta_feedback_update_admin"
  on public.beta_feedback for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "beta_feedback_delete_admin"
  on public.beta_feedback;
create policy "beta_feedback_delete_admin"
  on public.beta_feedback for delete
  to authenticated
  using (public.is_admin_or_above());
