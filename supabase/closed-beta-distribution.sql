-- Closed Beta 配布制御（スタンドアロン適用用）
-- See: migrations/20260724300000_closed_beta_distribution.sql

alter table public.profiles
  add column if not exists beta_terms_accepted_at timestamptz;

comment on column public.profiles.beta_terms_accepted_at is
  'Closed Beta 利用規約への同意日時（初回ログイン時）';

alter table public.certified_instructors
  add column if not exists usage_start_date date;

comment on column public.certified_instructors.usage_start_date is
  'Closed Beta 利用開始日。未設定時は招待の start_date を参照';

create index if not exists certified_instructors_usage_start_idx
  on public.certified_instructors (usage_start_date);
