-- ============================================================
-- clients.tags — 講師向けラベル（検索・絞り込み用）
-- Migration: 20260722160000_client_tags
-- ============================================================

alter table public.clients
  add column if not exists tags text[] not null default '{}';

comment on column public.clients.tags is
  '講師向けクライアントタグ（例: 夜勤, 高血圧）。自由入力可。';

create index if not exists clients_tags_gin_idx
  on public.clients using gin (tags);

-- create_client_with_profile に tags を追加
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

  -- 空文字・前後空白を除去し、重複を排除
  select coalesce(array_agg(distinct btrim(t)), '{}')
  into v_tags
  from unnest(v_tags) as t
  where btrim(t) <> '';

  select c.*
  into v_client
  from public.clients c
  where c.owner_id = v_uid
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

  insert into public.clients (owner_id, name, name_kana, memo, tags)
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
  'clients（最小カラム + tags）と空の client_profiles を同一トランザクションで作成。';

-- 旧シグネチャ向け grant を整理し、新シグネチャを公開
revoke all on function public.create_client_with_profile(text, text, text) from public;
revoke all on function public.create_client_with_profile(text, text, text) from authenticated;
drop function if exists public.create_client_with_profile(text, text, text);

revoke all on function public.create_client_with_profile(text, text, text, text[]) from public;
grant execute on function public.create_client_with_profile(text, text, text, text[]) to authenticated;
