-- Sleep Wellness Platform V1.0 — Platform tables + credits + RLS
-- Migration: 20260720100000_platform_v1
-- Prerequisites: 20260716100000_base_schema (profiles / clients / analyses)

-- ============================================================
-- roles (reference)
-- ============================================================
create table if not exists public.roles (
  id text primary key,
  label text not null,
  description text not null default '',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.roles (id, label, description, permissions)
values
  ('super_admin', 'Super Admin', '全権限', '{"all": true}'::jsonb),
  ('admin', 'Admin', '運営スタッフ', '{"credits": true, "membership": true, "members": true}'::jsonb),
  ('instructor', 'Instructor', '睡眠分析・履歴・プロフィール', '{"analysis": true}'::jsonb),
  ('client', 'Client', '自分のデータ閲覧のみ', '{"self": true}'::jsonb)
on conflict (id) do nothing;

-- ============================================================
-- profiles role constraint
-- ============================================================
-- 既存データが check 外だと ALTER が失敗してスクリプトが途中停止する
update public.profiles
set role = 'instructor'
where role is null
   or role not in ('super_admin', 'admin', 'instructor', 'client');

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'instructor', 'client'));

-- ============================================================
-- membership
-- ============================================================
create table if not exists public.membership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  certification_type text not null
    check (certification_type in (
      'navigator',
      'melatonin_yoga_instructor',
      'sleep_wellness_producer'
    )),
  certified_at date,
  expires_at date,
  status text not null default 'active'
    check (status in ('active', 'renewal_pending', 'suspended', 'expired')),
  continuing_education jsonb not null default '{}'::jsonb,
  admin_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists membership_user_id_idx on public.membership (user_id);
create unique index if not exists membership_user_cert_unique
  on public.membership (user_id, certification_type);

drop trigger if exists membership_set_updated_at on public.membership;
create trigger membership_set_updated_at
before update on public.membership
for each row execute function public.set_updated_at();

-- ============================================================
-- monthly_credit (毎月 30 / 分析 1 消費)
-- ============================================================
create table if not exists public.monthly_credit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year_month text not null,
  granted_amount integer not null default 30 check (granted_amount >= 0),
  used_amount integer not null default 0 check (used_amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, year_month),
  check (used_amount <= granted_amount + 1000)
);

create index if not exists monthly_credit_user_idx
  on public.monthly_credit (user_id, year_month desc);

-- ============================================================
-- credit_transactions
-- ============================================================
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in (
      'monthly_grant',
      'analysis_use',
      'purchase',
      'admin_grant',
      'admin_adjustment'
    )),
  amount integer not null,
  balance_after integer not null default 0,
  reference_id uuid,
  description text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_idx
  on public.credit_transactions (user_id, created_at desc);

-- ============================================================
-- analysis_history
-- ============================================================
create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  analysis_id uuid references public.analyses (id) on delete set null,
  client_name text not null default '',
  measurement_date date,
  sleep_score numeric,
  credits_consumed integer not null default 1 check (credits_consumed >= 0),
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists analysis_history_user_idx
  on public.analysis_history (user_id, created_at desc);

-- ============================================================
-- admin_logs
-- ============================================================
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_logs_created_idx on public.admin_logs (created_at desc);

-- ============================================================
-- notifications
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- ============================================================
-- Role helpers (SECURITY DEFINER + row_security off)
-- profiles RLS から呼ばれても profiles 再帰に入らない
-- ============================================================
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (select role = 'super_admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (select role in ('super_admin', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- Credit RPCs (atomic / RLS-safe)
-- ============================================================
create or replace function public.ensure_monthly_credit(p_user_id uuid default null)
returns public.monthly_credit
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_ym text := to_char(timezone('Asia/Tokyo', now()), 'YYYY-MM');
  v_row public.monthly_credit;
  v_new boolean := false;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- auth.uid() が null の signup/service 経路では管理者チェックしない
  if auth.uid() is not null
     and v_user_id <> auth.uid()
     and not public.is_admin_or_above() then
    raise exception 'forbidden';
  end if;

  -- 同一ユーザー・月の二重付与を直列化（トリガー連鎖ではなく advisory lock）
  perform pg_advisory_xact_lock(
    hashtext('swij_monthly_credit'),
    hashtext(v_user_id::text || ':' || v_ym)
  );

  insert into public.monthly_credit (user_id, year_month, granted_amount, used_amount)
  values (v_user_id, v_ym, 30, 0)
  on conflict (user_id, year_month) do nothing
  returning * into v_row;

  if found then
    v_new := true;
  else
    select * into strict v_row
    from public.monthly_credit
    where user_id = v_user_id and year_month = v_ym;
  end if;

  -- 新規行のときだけ月次付与トランザクションを書く（再実行・再帰防止）
  if v_new then
    insert into public.credit_transactions (
      user_id, type, amount, balance_after, reference_id, description, created_by
    ) values (
      v_user_id,
      'monthly_grant',
      v_row.granted_amount,
      greatest(0, v_row.granted_amount - v_row.used_amount),
      v_row.id,
      v_ym || ' 月次付与',
      null
    );
  end if;

  return v_row;
end;
$$;

create or replace function public.get_credit_balance(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_row public.monthly_credit;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'remaining', 0, 'message', 'ログインが必要です。');
  end if;

  if auth.uid() is not null
     and v_user_id <> auth.uid()
     and not public.is_admin_or_above() then
    return jsonb_build_object('ok', false, 'remaining', 0, 'message', '権限がありません。');
  end if;

  v_row := public.ensure_monthly_credit(v_user_id);

  return jsonb_build_object(
    'ok', true,
    'year_month', v_row.year_month,
    'granted', v_row.granted_amount,
    'used', v_row.used_amount,
    'remaining', greatest(0, v_row.granted_amount - v_row.used_amount)
  );
end;
$$;

create or replace function public.consume_analysis_credit(
  p_client_name text,
  p_measurement_date date default null,
  p_sleep_score numeric default null,
  p_client_id uuid default null,
  p_analysis_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_membership_status text;
  v_row public.monthly_credit;
  v_history_id uuid;
  v_balance integer;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'ログインが必要です。');
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if v_role is null then
    return jsonb_build_object('ok', false, 'message', 'プロフィールが見つかりません。');
  end if;

  if v_role in ('super_admin', 'admin') then
    return jsonb_build_object('ok', true, 'message', '管理者は消費対象外', 'remaining', 999);
  end if;

  select status into v_membership_status
  from public.membership
  where user_id = v_user_id
  order by updated_at desc
  limit 1;

  if v_membership_status is distinct from 'active' then
    return jsonb_build_object(
      'ok', false,
      'message',
      '認定資格の更新が必要です。Sleep Wellness Institute Japan までお問い合わせください。'
    );
  end if;

  v_row := public.ensure_monthly_credit(v_user_id);

  select * into v_row
  from public.monthly_credit
  where id = v_row.id
  for update;

  if (v_row.granted_amount - v_row.used_amount) < 1 then
    return jsonb_build_object('ok', false, 'message', 'クレジットが不足しています。管理者にお問い合わせください。');
  end if;

  update public.monthly_credit
  set used_amount = used_amount + 1
  where id = v_row.id
  returning (granted_amount - used_amount) into v_balance;

  insert into public.analysis_history (
    user_id,
    client_id,
    analysis_id,
    client_name,
    measurement_date,
    sleep_score,
    credits_consumed,
    status
  ) values (
    v_user_id,
    p_client_id,
    p_analysis_id,
    coalesce(p_client_name, ''),
    p_measurement_date,
    p_sleep_score,
    1,
    'completed'
  )
  returning id into v_history_id;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    reference_id,
    description,
    created_by
  ) values (
    v_user_id,
    'analysis_use',
    -1,
    v_balance,
    v_history_id,
    '睡眠分析: ' || coalesce(p_client_name, ''),
    v_user_id
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'クレジットを消費しました',
    'remaining', v_balance,
    'history_id', v_history_id
  );
end;
$$;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_admin_or_above() to authenticated;
grant execute on function public.ensure_monthly_credit(uuid) to authenticated;
grant execute on function public.get_credit_balance(uuid) to authenticated;
grant execute on function public.consume_analysis_credit(text, date, numeric, uuid, uuid) to authenticated;

-- ============================================================
-- Row Level Security
-- 書き込みは SECURITY DEFINER RPC（row_security=off）経由のみ
-- ============================================================
alter table public.roles enable row level security;
alter table public.membership enable row level security;
alter table public.monthly_credit enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.analysis_history enable row level security;
alter table public.admin_logs enable row level security;
alter table public.notifications enable row level security;

-- roles
drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated"
  on public.roles for select
  to authenticated
  using (true);

-- membership
drop policy if exists "membership_select_own_or_admin" on public.membership;
create policy "membership_select_own_or_admin"
  on public.membership for select
  using (auth.uid() = user_id or public.is_admin_or_above());

drop policy if exists "membership_manage_admin" on public.membership;
drop policy if exists "membership_insert_admin" on public.membership;
drop policy if exists "membership_update_admin" on public.membership;
drop policy if exists "membership_delete_admin" on public.membership;

create policy "membership_insert_admin"
  on public.membership for insert
  with check (public.is_super_admin());

create policy "membership_update_admin"
  on public.membership for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "membership_delete_admin"
  on public.membership for delete
  using (public.is_super_admin());

-- monthly_credit: 本人/管理者は参照のみ。INSERT/UPDATE は RPC（row_security=off）のみ
drop policy if exists "monthly_credit_select_own_or_admin" on public.monthly_credit;
create policy "monthly_credit_select_own_or_admin"
  on public.monthly_credit for select
  using (auth.uid() = user_id or public.is_admin_or_above());

drop policy if exists "monthly_credit_manage_admin" on public.monthly_credit;
drop policy if exists "monthly_credit_insert_own" on public.monthly_credit;
drop policy if exists "monthly_credit_update_own" on public.monthly_credit;
drop policy if exists "monthly_credit_insert_admin" on public.monthly_credit;
drop policy if exists "monthly_credit_update_admin" on public.monthly_credit;
drop policy if exists "monthly_credit_delete_admin" on public.monthly_credit;

create policy "monthly_credit_insert_admin"
  on public.monthly_credit for insert
  with check (public.is_super_admin());

create policy "monthly_credit_update_admin"
  on public.monthly_credit for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "monthly_credit_delete_admin"
  on public.monthly_credit for delete
  using (public.is_super_admin());

-- credit_transactions: 本人/管理者は参照のみ。INSERT は RPC / super_admin
drop policy if exists "credit_tx_select_own_or_admin" on public.credit_transactions;
create policy "credit_tx_select_own_or_admin"
  on public.credit_transactions for select
  using (auth.uid() = user_id or public.is_admin_or_above());

drop policy if exists "credit_tx_insert_own_or_admin" on public.credit_transactions;
drop policy if exists "credit_tx_insert_admin" on public.credit_transactions;
create policy "credit_tx_insert_admin"
  on public.credit_transactions for insert
  with check (public.is_super_admin());

-- analysis_history: 参照は本人/管理者。INSERT は RPC（row_security=off）
drop policy if exists "analysis_history_select_own_or_admin" on public.analysis_history;
create policy "analysis_history_select_own_or_admin"
  on public.analysis_history for select
  using (auth.uid() = user_id or public.is_admin_or_above());

drop policy if exists "analysis_history_insert_own" on public.analysis_history;
-- 直接 INSERT は許可しない（consume_analysis_credit 経由）

-- admin_logs（FOR ALL を避け、SELECT/INSERT/UPDATE/DELETE を分離）
drop policy if exists "admin_logs_super_admin" on public.admin_logs;
drop policy if exists "admin_logs_select_super_admin" on public.admin_logs;
drop policy if exists "admin_logs_insert_super_admin" on public.admin_logs;
drop policy if exists "admin_logs_update_super_admin" on public.admin_logs;
drop policy if exists "admin_logs_delete_super_admin" on public.admin_logs;

create policy "admin_logs_select_super_admin"
  on public.admin_logs for select
  using (public.is_super_admin());

create policy "admin_logs_insert_super_admin"
  on public.admin_logs for insert
  with check (public.is_super_admin());

create policy "admin_logs_update_super_admin"
  on public.admin_logs for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "admin_logs_delete_super_admin"
  on public.admin_logs for delete
  using (public.is_super_admin());

-- notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin"
  on public.notifications for insert
  with check (public.is_admin_or_above());

-- profiles: admin 全件参照
-- is_admin_or_above() は row_security=off のため profiles 再帰なし
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin_or_above());

-- ============================================================
-- Signup: profile + membership + monthly credit (instructor)
-- auth.users INSERT → 本関数のみ。profiles / membership / credit への
-- AFTER/AFTER trigger は置かない（相互呼び出し・再帰防止）
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  assigned_role text;
  v_cert text;
  v_ym text := to_char(timezone('Asia/Tokyo', now()), 'YYYY-MM');
  v_credit public.monthly_credit;
begin
  assigned_role := coalesce(new.raw_user_meta_data->>'role', 'instructor');

  if assigned_role not in ('super_admin', 'admin', 'instructor', 'client') then
    assigned_role := 'instructor';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (id) do nothing;

  if assigned_role = 'instructor' then
    v_cert := coalesce(new.raw_user_meta_data->>'certification_type', 'navigator');
    if v_cert not in (
      'navigator',
      'melatonin_yoga_instructor',
      'sleep_wellness_producer'
    ) then
      v_cert := 'navigator';
    end if;

    insert into public.membership (
      user_id,
      certification_type,
      certified_at,
      expires_at,
      status
    )
    values (
      new.id,
      v_cert,
      current_date,
      (current_date + interval '1 year')::date,
      'active'
    )
    on conflict (user_id, certification_type) do nothing;

    -- ensure_monthly_credit は呼ばない（auth.uid() 未設定の signup 経路を単純化）
    insert into public.monthly_credit (user_id, year_month, granted_amount, used_amount)
    values (new.id, v_ym, 30, 0)
    on conflict (user_id, year_month) do nothing
    returning * into v_credit;

    if found then
      insert into public.credit_transactions (
        user_id, type, amount, balance_after, reference_id, description, created_by
      ) values (
        new.id,
        'monthly_grant',
        v_credit.granted_amount,
        greatest(0, v_credit.granted_amount - v_credit.used_amount),
        v_credit.id,
        v_ym || ' 月次付与',
        null
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
