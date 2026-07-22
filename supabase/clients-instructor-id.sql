-- ============================================================
-- clients.owner_id → instructor_id
-- 認定講師ごとのクライアント分離を明示する
-- Migration: 20260722190000_clients_instructor_id
-- （Supabase SQL Editor 用ミラー）
--
-- instructor_id = Supabase Auth のログインユーザー ID（auth.uid()）
-- 関連テーブル（analyses / client_profiles 等）の owner_id は変更しない。
-- ============================================================

-- 1. 列リネーム（未適用環境のみ）
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'owner_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'instructor_id'
  ) then
    alter table public.clients rename column owner_id to instructor_id;
  end if;
end $$;

alter index if exists clients_owner_id_idx
  rename to clients_instructor_id_idx;
alter index if exists clients_owner_updated_idx
  rename to clients_instructor_updated_idx;

comment on column public.clients.instructor_id is
  '担当認定講師の auth.users.id（Supabase Auth ログインユーザー）';

-- 2. clients RLS（instructor_id = auth.uid()）
drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
  on public.clients for select
  using (auth.uid() = instructor_id);

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
  on public.clients for insert
  with check (auth.uid() = instructor_id);

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
  on public.clients for update
  using (auth.uid() = instructor_id)
  with check (auth.uid() = instructor_id);

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
  on public.clients for delete
  using (auth.uid() = instructor_id);

-- 3. 子テーブル RLS: clients 参照を instructor_id に更新（テーブルが存在する場合のみ）
do $$
begin
  if to_regclass('public.client_profiles') is not null then
    drop policy if exists "client_profiles_insert_own" on public.client_profiles;
    create policy "client_profiles_insert_own"
      on public.client_profiles for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_profiles_update_own" on public.client_profiles;
    create policy "client_profiles_update_own"
      on public.client_profiles for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.client_guidance_notes') is not null then
    drop policy if exists "client_guidance_notes_insert_own"
      on public.client_guidance_notes;
    create policy "client_guidance_notes_insert_own"
      on public.client_guidance_notes for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_guidance_notes_update_own"
      on public.client_guidance_notes;
    create policy "client_guidance_notes_update_own"
      on public.client_guidance_notes for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.client_appointments') is not null then
    drop policy if exists "client_appointments_insert_own"
      on public.client_appointments;
    create policy "client_appointments_insert_own"
      on public.client_appointments for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_appointments_update_own"
      on public.client_appointments;
    create policy "client_appointments_update_own"
      on public.client_appointments for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.client_occupation_attributes') is not null then
    drop policy if exists "client_occupation_attributes_insert_own"
      on public.client_occupation_attributes;
    create policy "client_occupation_attributes_insert_own"
      on public.client_occupation_attributes for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_occupation_attributes_update_own"
      on public.client_occupation_attributes;
    create policy "client_occupation_attributes_update_own"
      on public.client_occupation_attributes for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.client_metric_baselines') is not null then
    drop policy if exists "client_metric_baselines_insert_own"
      on public.client_metric_baselines;
    create policy "client_metric_baselines_insert_own"
      on public.client_metric_baselines for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );

    drop policy if exists "client_metric_baselines_update_own"
      on public.client_metric_baselines;
    create policy "client_metric_baselines_update_own"
      on public.client_metric_baselines for update
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.clients c
          where c.id = client_id and c.instructor_id = auth.uid()
        )
      );
  end if;
end $$;

-- 4. RPC: 新規登録時に auth.uid() を instructor_id へ自動保存
create or replace function public.create_client_with_profile(
  p_name text,
  p_name_kana text default null,
  p_memo text default null,
  p_tags text[] default '{}'
)
returns public.clients
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_kana text := nullif(btrim(coalesce(p_name_kana, '')), '');
  v_memo text := nullif(btrim(coalesce(p_memo, '')), '');
  v_tags text[] := coalesce(p_tags, '{}');
  v_client public.clients;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_name is null then
    raise exception 'Name is required';
  end if;

  select coalesce(array_agg(distinct btrim(t)), '{}')
  into v_tags
  from unnest(v_tags) as t
  where btrim(t) <> '';

  -- 同名（講師内・大小無視・空白正規化）があれば既存を返し、profile を確保
  select c.*
  into v_client
  from public.clients c
  where c.instructor_id = v_uid
    and lower(regexp_replace(btrim(c.name), '\s+', ' ', 'g'))
      = lower(regexp_replace(v_name, '\s+', ' ', 'g'))
  order by c.created_at asc
  limit 1;

  if found then
    insert into public.client_profiles (client_id, owner_id, basic)
    values (
      v_client.id,
      v_uid,
      jsonb_build_object('fullName', v_client.name)
    )
    on conflict (client_id) do nothing;

    return v_client;
  end if;

  insert into public.clients (instructor_id, name, name_kana, memo, tags)
  values (v_uid, v_name, v_kana, v_memo, v_tags)
  returning * into v_client;

  insert into public.client_profiles (client_id, owner_id, basic)
  values (
    v_client.id,
    v_uid,
    jsonb_build_object('fullName', v_client.name)
  );

  return v_client;
end;
$$;

comment on function public.create_client_with_profile(text, text, text, text[]) is
  'clients（instructor_id = auth.uid()）と空の client_profiles を同一トランザクションで作成。';

create or replace function public.ensure_client_profile(
  p_client_id uuid
)
returns public.client_profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_client public.clients;
  v_profile public.client_profiles;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select c.*
  into v_client
  from public.clients c
  where c.id = p_client_id
    and c.instructor_id = v_uid;

  if not found then
    raise exception 'Client not found';
  end if;

  select p.*
  into v_profile
  from public.client_profiles p
  where p.client_id = p_client_id
    and p.owner_id = v_uid;

  if found then
    return v_profile;
  end if;

  insert into public.client_profiles (client_id, owner_id, basic)
  values (
    v_client.id,
    v_uid,
    jsonb_build_object('fullName', v_client.name)
  )
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.create_client_with_profile(text, text, text, text[]) from public;
grant execute on function public.create_client_with_profile(text, text, text, text[]) to authenticated;

revoke all on function public.ensure_client_profile(uuid) from public;
grant execute on function public.ensure_client_profile(uuid) to authenticated;
