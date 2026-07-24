-- Migration: 20260724220000_license_billing_rbac_v22
-- Version 2.2 — 権限 / ライセンス / 課金 / 招待 / 監査
-- 既存 public.roles（platform-v1: id text PK）を拡張利用

-- ============================================================
-- profiles.role に school（認定校）を追加
-- ============================================================
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'super_admin',
      'admin',
      'school',
      'instructor',
      'client',
      'enterprise'
    )
  );

-- ============================================================
-- roles（既存カタログを Version 2.2 権限表示向けに更新）
-- ============================================================
insert into public.roles (id, label, description, permissions)
values
  (
    'super_admin',
    'SWIJ本部（Super Admin）',
    '全国の認定校・認定講師・ライセンス・課金・監査を統括します。',
    '{"authority":"hq","scope":"global","edit":true}'::jsonb
  ),
  (
    'admin',
    'SWIJ本部',
    '全国の認定校・認定講師・ライセンス・課金・監査を統括します。',
    '{"authority":"hq","scope":"global","edit":true}'::jsonb
  ),
  (
    'school',
    '認定校',
    '所属認定講師・受講生・講座の閲覧と校内運営を行います。',
    '{"authority":"school","scope":"school","edit":true}'::jsonb
  ),
  (
    'instructor',
    '認定講師',
    '担当クライアントの分析・宿題・招待・レポートを運営します。',
    '{"authority":"instructor","scope":"own_clients","edit":true}'::jsonb
  ),
  (
    'client',
    'クライアント',
    '自身の睡眠データ・宿題・コーチングを閲覧・更新します。',
    '{"authority":"client","scope":"self","edit":true}'::jsonb
  ),
  (
    'enterprise',
    '企業管理者',
    '組織向けダッシュボードを利用します。',
    '{"authority":"enterprise","scope":"org","edit":true}'::jsonb
  )
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  permissions = excluded.permissions;

alter table public.roles enable row level security;

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated
  on public.roles for select
  to authenticated
  using (true);

drop policy if exists roles_admin_write on public.roles;
create policy roles_admin_write
  on public.roles for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ============================================================
-- licenses / subscriptions（既存テーブルを保証）
-- ============================================================
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_email text,
  user_display_name text,
  license_number text not null,
  certification_level text not null,
  certified_at date not null,
  expires_at date not null,
  status text not null default 'active',
  status_history jsonb not null default '[]'::jsonb,
  admin_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint licenses_number_unique unique (license_number)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  license_id uuid references public.licenses (id) on delete set null,
  plan text not null default 'instructor',
  billing_cycle text not null default 'yearly',
  monthly_amount integer not null default 0,
  yearly_amount integer not null default 0,
  status text not null default 'active',
  current_period_start date not null default current_date,
  current_period_end date not null default (current_date + 365),
  next_renewal_at date not null default (current_date + 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- commercial_subscriptions（Basic / Professional / Enterprise モック）
-- ============================================================
create table if not exists public.commercial_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_email text,
  user_display_name text,
  plan_id text not null,
  status text not null default 'none',
  billing_cycle text not null default 'monthly',
  current_period_end date,
  mock_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_subscriptions_plan_check
    check (plan_id in ('basic', 'professional', 'enterprise')),
  constraint commercial_subscriptions_status_check
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'none')),
  constraint commercial_subscriptions_billing_check
    check (billing_cycle in ('monthly', 'yearly'))
);

create index if not exists commercial_subscriptions_user_id_idx
  on public.commercial_subscriptions (user_id, updated_at desc);

comment on table public.commercial_subscriptions is
  'Version 2.2 商用プラン（Basic/Professional/Enterprise）— 課金ゲートウェイ未接続のモック';

drop trigger if exists commercial_subscriptions_set_updated_at
  on public.commercial_subscriptions;
create trigger commercial_subscriptions_set_updated_at
before update on public.commercial_subscriptions
for each row execute function public.set_updated_at();

alter table public.commercial_subscriptions enable row level security;

drop policy if exists commercial_subscriptions_select_own
  on public.commercial_subscriptions;
create policy commercial_subscriptions_select_own
  on public.commercial_subscriptions for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists commercial_subscriptions_write_own
  on public.commercial_subscriptions;
create policy commercial_subscriptions_write_own
  on public.commercial_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin_or_above());

drop policy if exists commercial_subscriptions_update_own
  on public.commercial_subscriptions;
create policy commercial_subscriptions_update_own
  on public.commercial_subscriptions for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_above())
  with check (user_id = auth.uid() or public.is_admin_or_above());

drop policy if exists commercial_subscriptions_admin_all
  on public.commercial_subscriptions;
create policy commercial_subscriptions_admin_all
  on public.commercial_subscriptions for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ============================================================
-- invitations（認定講師のみ発行）
-- ============================================================
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  instructor_email text,
  instructor_name text,
  client_name text not null,
  client_email text not null,
  client_id uuid,
  status text not null default 'pending',
  email_subject text not null default '',
  email_body text not null default '',
  expires_at timestamptz not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_code_unique unique (code),
  constraint invitations_status_check
    check (
      status in ('pending', 'sent', 'accepted', 'expired', 'revoked')
    )
);

create index if not exists invitations_instructor_id_idx
  on public.invitations (instructor_id, created_at desc);

create index if not exists invitations_code_idx
  on public.invitations (code);

create index if not exists invitations_email_idx
  on public.invitations (client_email);

comment on table public.invitations is
  '認定講師によるクライアント招待（コード・メール・受諾状態）';

drop trigger if exists invitations_set_updated_at on public.invitations;
create trigger invitations_set_updated_at
before update on public.invitations
for each row execute function public.set_updated_at();

alter table public.invitations enable row level security;

drop policy if exists invitations_instructor_select on public.invitations;
create policy invitations_instructor_select
  on public.invitations for select
  to authenticated
  using (
    instructor_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists invitations_instructor_insert on public.invitations;
create policy invitations_instructor_insert
  on public.invitations for insert
  to authenticated
  with check (
    instructor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'instructor'
    )
  );

drop policy if exists invitations_instructor_update on public.invitations;
create policy invitations_instructor_update
  on public.invitations for update
  to authenticated
  using (
    instructor_id = auth.uid()
    or public.is_admin_or_above()
  )
  with check (
    instructor_id = auth.uid()
    or public.is_admin_or_above()
  );

-- 公開招待コードの peek / accept（RLS を迂回する SECURITY DEFINER）
create or replace function public.peek_invitation_by_code(p_code text)
returns setof public.invitations
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select *
  from public.invitations
  where upper(code) = upper(trim(p_code))
  limit 1;
end;
$$;

revoke all on function public.peek_invitation_by_code(text) from public;
grant execute on function public.peek_invitation_by_code(text)
  to anon, authenticated;

create or replace function public.accept_invitation_by_code(
  p_code text,
  p_client_id uuid default null
)
returns public.invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitations;
begin
  select * into v_row
  from public.invitations
  where upper(code) = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  if v_row.status = 'revoked' then
    raise exception 'INVITE_REVOKED';
  end if;

  if v_row.status = 'accepted' then
    return v_row;
  end if;

  if v_row.expires_at < now() then
    update public.invitations
    set status = 'expired', updated_at = now()
    where id = v_row.id
    returning * into v_row;
    raise exception 'INVITE_EXPIRED';
  end if;

  update public.invitations
  set
    status = 'accepted',
    accepted_at = now(),
    client_id = coalesce(p_client_id, client_id),
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.accept_invitation_by_code(text, uuid) from public;
grant execute on function public.accept_invitation_by_code(text, uuid)
  to anon, authenticated;

-- ============================================================
-- audit_logs（重要操作の監査）
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  actor_role text,
  action text not null,
  resource_type text,
  resource_id text,
  summary text not null default '',
  payload jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_check
    check (
      action in (
        'login',
        'analysis_run',
        'report_create',
        'client_add',
        'license_update',
        'invitation_create',
        'invitation_send',
        'role_change',
        'subscription_view',
        'other'
      )
    )
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action, created_at desc);

create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id, created_at desc);

comment on table public.audit_logs is
  'Version 2.2 監査ログ（ログイン・分析・レポート・クライアント追加・ライセンス更新 等）';

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select
  on public.audit_logs for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated
  on public.audit_logs for insert
  to authenticated
  with check (
    actor_id is null
    or actor_id = auth.uid()
  );
