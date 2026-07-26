-- ============================================================
-- Fix: Client Portal マイページ連携 / 招待 / Chat
-- Migration: 20260726120000_fix_client_portal_link_chat
--
-- Idempotent（SQL Editor で再実行可）
-- - clients.auth_user_id / link_client_portal_user 強化
-- - client_messages テーブル + RLS 確認
-- - invitations 確認 / accept 時に clients.email を同期
-- ============================================================

-- ------------------------------------------------------------
-- 1) clients.auth_user_id
-- ------------------------------------------------------------
alter table public.clients
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists clients_auth_user_id_uidx
  on public.clients (auth_user_id)
  where auth_user_id is not null;

comment on column public.clients.auth_user_id is
  'クライアント本人の auth.users.id（マイページ閲覧用）';

-- 同一講師内でのメール重複検索用（一意制約ではなくインデックスのみ）
create index if not exists clients_instructor_email_lower_idx
  on public.clients (instructor_id, lower(trim(email)))
  where email is not null and length(trim(email)) > 0;

-- ------------------------------------------------------------
-- 2) profiles 表示用（未適用環境向け）
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists client_message text;

-- ------------------------------------------------------------
-- 3) is_linked_client
-- ------------------------------------------------------------
create or replace function public.is_linked_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.is_linked_client(uuid) from public;
grant execute on function public.is_linked_client(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) claim_my_client_portal
-- ------------------------------------------------------------
create or replace function public.claim_my_client_portal()
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_row public.clients;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null or length(trim(v_email)) = 0 then
    raise exception 'email not found';
  end if;

  select * into v_row
  from public.clients
  where auth_user_id = v_uid
  limit 1;

  if found then
    update public.profiles
      set role = 'client'
    where id = v_uid
      and role is distinct from 'client';
    return v_row;
  end if;

  select * into v_row
  from public.clients
  where auth_user_id is null
    and lower(trim(coalesce(email, ''))) = lower(trim(v_email))
  order by updated_at desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  update public.clients
    set auth_user_id = v_uid
  where id = v_row.id
  returning * into v_row;

  update public.profiles
    set role = 'client'
  where id = v_uid
    and role is distinct from 'client';

  return v_row;
end;
$$;

revoke all on function public.claim_my_client_portal() from public;
grant execute on function public.claim_my_client_portal() to authenticated;

-- ------------------------------------------------------------
-- 5) link_client_portal_user（バリデーション + 重複処理）
-- ------------------------------------------------------------
create or replace function public.link_client_portal_user(
  p_client_id uuid,
  p_email text default null,
  p_auth_user_id uuid default null
)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.clients;
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_auth uuid := p_auth_user_id;
  v_conflict_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.clients
  where id = p_client_id
    and instructor_id = v_uid
  for update;

  if not found then
    raise exception 'client not found or not owned';
  end if;

  if v_email is not null then
    if v_email !~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$' then
      raise exception 'invalid email format';
    end if;
  end if;

  if v_auth is null and v_email is not null then
    select id into v_auth
    from auth.users
    where lower(trim(email)) = v_email
    limit 1;
  end if;

  -- 同一講師内: 同じメールを持つ他クライアントから email を外す
  if v_email is not null then
    update public.clients
      set email = null
    where instructor_id = v_uid
      and id <> p_client_id
      and lower(trim(coalesce(email, ''))) = v_email;
  end if;

  -- auth_user_id の一意制約を壊さないよう、同一講師内なら付け替え
  if v_auth is not null then
    update public.clients
      set auth_user_id = null
    where instructor_id = v_uid
      and id <> p_client_id
      and auth_user_id = v_auth;

    select id into v_conflict_id
    from public.clients
    where auth_user_id = v_auth
      and id <> p_client_id
    limit 1;

    if v_conflict_id is not null then
      raise exception 'email already linked to another client';
    end if;
  end if;

  update public.clients
    set
      email = coalesce(v_email, email),
      auth_user_id = case
        when v_auth is not null then v_auth
        else auth_user_id
      end
  where id = p_client_id
  returning * into v_row;

  if v_auth is not null then
    update public.profiles
      set role = 'client'
    where id = v_auth
      and role is distinct from 'client';
  end if;

  return v_row;
end;
$$;

revoke all on function public.link_client_portal_user(uuid, text, uuid) from public;
grant execute on function public.link_client_portal_user(uuid, text, uuid) to authenticated;

-- clients: 本人 SELECT
drop policy if exists "clients_select_linked_self" on public.clients;
create policy "clients_select_linked_self"
  on public.clients for select
  using (auth.uid() = auth_user_id);

-- ------------------------------------------------------------
-- 6) client_messages（未作成なら作成）
-- ------------------------------------------------------------
create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid not null
    references auth.users (id) on delete cascade,
  sender_role text not null
    check (sender_role in ('instructor', 'client')),
  sender_id uuid not null
    references auth.users (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_messages_body_not_blank
    check (length(trim(body)) > 0),
  constraint client_messages_body_max
    check (char_length(body) <= 4000)
);

create index if not exists client_messages_client_created_idx
  on public.client_messages (client_id, created_at desc);

create index if not exists client_messages_instructor_created_idx
  on public.client_messages (instructor_id, created_at desc);

create index if not exists client_messages_unread_idx
  on public.client_messages (client_id, read_at)
  where read_at is null;

comment on table public.client_messages is
  'Client Portal チャット（認定講師とクライアントのメッセージ）';

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_updated_at'
  ) then
    drop trigger if exists client_messages_set_updated_at on public.client_messages;
    create trigger client_messages_set_updated_at
    before update on public.client_messages
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.client_messages enable row level security;

drop policy if exists "client_messages_select_linked_or_instructor"
  on public.client_messages;
create policy "client_messages_select_linked_or_instructor"
  on public.client_messages for select
  to authenticated
  using (
    public.is_linked_client(client_id)
    or instructor_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "client_messages_insert_linked_or_instructor"
  on public.client_messages;
create policy "client_messages_insert_linked_or_instructor"
  on public.client_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (
        sender_role = 'client'
        and public.is_linked_client(client_id)
      )
      or (
        sender_role = 'instructor'
        and instructor_id = auth.uid()
        and exists (
          select 1 from public.clients c
          where c.id = client_id
            and c.instructor_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "client_messages_update_linked_or_instructor"
  on public.client_messages;
create policy "client_messages_update_linked_or_instructor"
  on public.client_messages for update
  to authenticated
  using (
    public.is_linked_client(client_id)
    or instructor_id = auth.uid()
  )
  with check (
    public.is_linked_client(client_id)
    or instructor_id = auth.uid()
  );

-- ------------------------------------------------------------
-- 7) invitations（未作成なら作成）+ accept で email 同期
-- ------------------------------------------------------------
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
  v_target_client uuid;
  v_auth uuid := auth.uid();
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

  v_target_client := coalesce(p_client_id, v_row.client_id);

  update public.invitations
  set
    status = 'accepted',
    accepted_at = now(),
    client_id = coalesce(v_target_client, client_id),
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  -- 招待メールを clients.email に同期（担当クライアントのみ）
  if v_row.client_id is not null then
    update public.clients
      set email = lower(trim(v_row.client_email))
    where id = v_row.client_id
      and instructor_id = v_row.instructor_id;

    -- 受諾者がログイン済みなら auth_user_id も紐付け
    if v_auth is not null then
      update public.clients
        set auth_user_id = v_auth
      where id = v_row.client_id
        and instructor_id = v_row.instructor_id
        and (
          auth_user_id is null
          or auth_user_id = v_auth
        );

      update public.profiles
        set role = 'client'
      where id = v_auth
        and role is distinct from 'client';
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.accept_invitation_by_code(text, uuid) from public;
grant execute on function public.accept_invitation_by_code(text, uuid)
  to anon, authenticated;
