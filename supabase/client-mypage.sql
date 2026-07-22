-- ============================================================
-- Client My Page (/client)
-- Migration: 20260722200000_client_mypage
--
-- - clients.auth_user_id: ログイン中クライアント本人との紐付け
-- - profiles.avatar_url / client_message: 担当講師の表示用
-- - クライアント本人の SELECT / 宿題チェック更新 RPC
-- ============================================================

-- 1. clients.auth_user_id
alter table public.clients
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists clients_auth_user_id_uidx
  on public.clients (auth_user_id)
  where auth_user_id is not null;

comment on column public.clients.auth_user_id is
  'クライアント本人の auth.users.id（マイページ閲覧用）';

-- 2. profiles: 担当講師の写真・メッセージ
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists client_message text;

comment on column public.profiles.avatar_url is
  '認定講師プロフィール写真 URL（クライアントマイページ表示用）';
comment on column public.profiles.client_message is
  '認定講師からクライアントへのメッセージ（マイページ表示用）';

-- 3. Helper: ログインユーザーが紐付いたクライアントか
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

-- 4. RLS — clients: 本人 SELECT
drop policy if exists "clients_select_linked_self" on public.clients;
create policy "clients_select_linked_self"
  on public.clients for select
  using (auth.uid() = auth_user_id);

-- 5. RLS — analyses: 本人 SELECT（宿題チェック更新は RPC）
drop policy if exists "analyses_select_linked_client" on public.analyses;
create policy "analyses_select_linked_client"
  on public.analyses for select
  using (public.is_linked_client(client_id));

-- 6. RLS — guidance notes: 本人 SELECT
do $$
begin
  if to_regclass('public.client_guidance_notes') is not null then
    drop policy if exists "client_guidance_notes_select_linked_client"
      on public.client_guidance_notes;
    create policy "client_guidance_notes_select_linked_client"
      on public.client_guidance_notes for select
      using (public.is_linked_client(client_id));
  end if;
end $$;

-- 7. RLS — profiles: 担当講師の公開フィールドを本人が読める
drop policy if exists "profiles_select_assigned_instructor" on public.profiles;
create policy "profiles_select_assigned_instructor"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.clients c
      where c.auth_user_id = auth.uid()
        and c.instructor_id = profiles.id
    )
  );

-- 8. メール一致でクライアント行を自分に紐付ける
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

  -- 既に紐付いていればそれを返す
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

  -- email 一致かつ未紐付けのクライアントを claim
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

-- 9. 認定講師がクライアントに auth_user_id / email を設定
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
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_auth uuid := p_auth_user_id;
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

  if v_auth is null and v_email is not null then
    select id into v_auth
    from auth.users
    where lower(trim(email)) = lower(v_email)
    limit 1;
  end if;

  update public.clients
    set
      email = coalesce(v_email, email),
      auth_user_id = coalesce(v_auth, auth_user_id)
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

-- 10. クライアント本人が宿題チェックのみ更新
create or replace function public.update_own_homework_checks(
  p_analysis_id uuid,
  p_goals jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.analyses;
  v_result jsonb;
  v_payload jsonb;
  v_medical jsonb;
  v_goals jsonb;
  v_checked int;
  v_total int;
  v_rate int;
  v_achievement jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_goals is null or jsonb_typeof(p_goals) <> 'array' then
    raise exception 'goals must be a json array';
  end if;

  select a.* into v_row
  from public.analyses a
  where a.id = p_analysis_id;

  if not found then
    raise exception 'analysis not found or not allowed';
  end if;

  if not public.is_linked_client(v_row.client_id) then
    raise exception 'analysis not found or not allowed';
  end if;

  v_goals := p_goals;
  v_total := coalesce(jsonb_array_length(v_goals), 0);
  select count(*)::int into v_checked
  from jsonb_array_elements(v_goals) g
  where coalesce((g->>'checked')::boolean, false);

  v_rate := case when v_total = 0 then 0 else round((v_checked::numeric / v_total::numeric) * 100)::int end;
  v_achievement := jsonb_build_object(
    'checked', v_checked,
    'total', v_total,
    'rate', v_rate
  );

  v_result := coalesce(v_row.ai_result, '{}'::jsonb);
  v_result := v_result
    || jsonb_build_object(
      'recommendationsUntilNext', v_goals,
      'homeworkAchievement', v_achievement,
      'analysisId', p_analysis_id::text
    );

  v_payload := coalesce(v_row.report_payload, '{}'::jsonb);
  v_medical := coalesce(v_payload->'medical', '{}'::jsonb);
  v_medical := v_medical
    || jsonb_build_object(
      'recommendationsUntilNext', v_goals,
      'homeworkAchievement', v_achievement
    );
  v_payload := v_payload || jsonb_build_object('medical', v_medical);

  begin
    update public.analyses
      set
        ai_result = v_result,
        report_payload = v_payload
    where id = p_analysis_id;
  exception
    when undefined_column then
      update public.analyses
        set ai_result = v_result
      where id = p_analysis_id;
  end;

  return v_result;
end;
$$;

revoke all on function public.update_own_homework_checks(uuid, jsonb) from public;
grant execute on function public.update_own_homework_checks(uuid, jsonb) to authenticated;
