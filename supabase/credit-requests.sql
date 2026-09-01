-- ============================================================
-- credit_requests — 分析回数追加パックの振込申請
-- 実行: Supabase SQL Editor またはマイグレーションとして適用
-- ============================================================

create table if not exists public.credit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sets integer not null check (sets between 1 and 5),
  credits integer not null,
  amount_yen integer not null,
  status text not null default 'pending',
  note text not null default '',
  admin_memo text not null default '',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles (id),
  constraint credit_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint credit_requests_credits_positive check (credits > 0),
  constraint credit_requests_amount_positive check (amount_yen > 0)
);

create index if not exists credit_requests_user_requested_idx
  on public.credit_requests (user_id, requested_at desc);

create index if not exists credit_requests_status_requested_idx
  on public.credit_requests (status, requested_at desc);

-- 講師あたり pending は同時に1件まで
create unique index if not exists credit_requests_one_pending_per_user_idx
  on public.credit_requests (user_id)
  where status = 'pending';

comment on table public.credit_requests is
  '分析回数追加パック（1セット=10回/1,000円）の振込申請';

alter table public.credit_requests enable row level security;

drop policy if exists "credit_requests_select_own_or_admin"
  on public.credit_requests;
create policy "credit_requests_select_own_or_admin"
  on public.credit_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "credit_requests_insert_own"
  on public.credit_requests;
create policy "credit_requests_insert_own"
  on public.credit_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

drop policy if exists "credit_requests_update_admin"
  on public.credit_requests;
create policy "credit_requests_update_admin"
  on public.credit_requests for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());
