-- ============================================================
-- create_client_with_profile / ensure_client_profile
-- Migration: 20260722150000_create_client_with_profile
-- Extended: 20260722160000_client_tags (p_tags)
-- Updated: 20260722190000_clients_instructor_id
--
-- clients は最小情報のみ（id / instructor_id / name / name_kana / memo / tags / created_at）。
-- 年齢・身長・体重・性別・職業・健康情報は client_profiles へ。
-- 作成は単一トランザクションで行い、途中失敗時はロールバックする。
-- instructor_id は auth.uid()（ログイン中の認定講師）を自動保存する。
-- ============================================================

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
  'clients（instructor_id = auth.uid()）と空の client_profiles を同一トランザクションで作成。失敗時はロールバック。';

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

comment on function public.ensure_client_profile(uuid) is
  'client_profiles が無ければ空行を作成して返す。担当講師のクライアントのみ。';

revoke all on function public.create_client_with_profile(text, text, text, text[]) from public;
grant execute on function public.create_client_with_profile(text, text, text, text[]) to authenticated;

revoke all on function public.ensure_client_profile(uuid) from public;
grant execute on function public.ensure_client_profile(uuid) to authenticated;
