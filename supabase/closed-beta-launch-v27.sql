-- Version 2.7 — Closed Beta Launch
-- Migration: 20260724270000_closed_beta_launch_v27
-- Tables: beta_instructor_invitations

create table if not exists public.beta_instructor_invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  instructor_name text not null,
  instructor_email text not null,
  start_date date not null,
  status text not null default 'draft',
  email_subject text not null default '',
  email_body text not null default '',
  terms_required boolean not null default true,
  terms_accepted_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_instructor_invitations_code_not_blank
    check (length(trim(code)) > 0),
  constraint beta_instructor_invitations_name_not_blank
    check (length(trim(instructor_name)) > 0),
  constraint beta_instructor_invitations_email_not_blank
    check (length(trim(instructor_email)) > 0),
  constraint beta_instructor_invitations_status_check
    check (status in ('draft', 'sent', 'accepted', 'expired', 'revoked'))
);

create unique index if not exists beta_instructor_invitations_code_uidx
  on public.beta_instructor_invitations (upper(code));

create index if not exists beta_instructor_invitations_created_idx
  on public.beta_instructor_invitations (created_at desc);

create index if not exists beta_instructor_invitations_status_idx
  on public.beta_instructor_invitations (status, created_at desc);

comment on table public.beta_instructor_invitations is
  'Closed Beta 認定講師招待（メールモック・コード・利用開始日・規約同意）';

drop trigger if exists beta_instructor_invitations_set_updated_at
  on public.beta_instructor_invitations;
create trigger beta_instructor_invitations_set_updated_at
before update on public.beta_instructor_invitations
for each row execute function public.set_updated_at();

alter table public.beta_instructor_invitations enable row level security;

drop policy if exists beta_instructor_invitations_admin_all
  on public.beta_instructor_invitations;
create policy beta_instructor_invitations_admin_all
  on public.beta_instructor_invitations for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

drop policy if exists beta_instructor_invitations_select_by_code
  on public.beta_instructor_invitations;
create policy beta_instructor_invitations_select_by_code
  on public.beta_instructor_invitations for select
  to authenticated, anon
  using (true);

drop policy if exists beta_instructor_invitations_accept_update
  on public.beta_instructor_invitations;
create policy beta_instructor_invitations_accept_update
  on public.beta_instructor_invitations for update
  to authenticated, anon
  using (status in ('draft', 'sent'))
  with check (status in ('draft', 'sent', 'accepted'));
