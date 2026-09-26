-- ============================================================
-- メラトニンヨガ™ 申込・開催日程
-- 公開フォームの申込・日程一覧はサーバー API 経由（lib/supabase/admin.ts）。
-- create_melatonin_yoga_registration() は service_role からのみ実行可。
-- 申込本体と選択日程は同一トランザクションで保存し、定員チェックもその中で行う。
-- ============================================================

-- ------------------------------------------------------------
-- 開催日程
-- ------------------------------------------------------------

create table if not exists public.melatonin_yoga_event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  format text not null,
  location text not null default '',
  capacity integer not null,
  registration_closed boolean not null default false,
  published boolean not null default false,
  admin_note text not null default '',
  schedule_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint melatonin_yoga_event_sessions_event_type_check
    check (event_type in ('consultation', 'workshop', 'training_course')),
  constraint melatonin_yoga_event_sessions_format_check
    check (format in ('online', 'in_person', 'hybrid')),
  constraint melatonin_yoga_event_sessions_capacity_positive
    check (capacity > 0),
  constraint melatonin_yoga_event_sessions_location_not_null
    check (location is not null)
);

comment on table public.melatonin_yoga_event_sessions is
  'メラトニンヨガ™ 相談会・ワークショップ・養成コースの開催日程';
comment on column public.melatonin_yoga_event_sessions.event_type is
  'consultation=相談会, workshop=ワークショップ, training_course=養成コース';
comment on column public.melatonin_yoga_event_sessions.format is
  'online=オンライン, in_person=対面, hybrid=オンライン・対面';
comment on column public.melatonin_yoga_event_sessions.registration_closed is
  'true の場合、フォームからは選択不可';
comment on column public.melatonin_yoga_event_sessions.published is
  'true の場合のみ公開フォームに表示';
comment on column public.melatonin_yoga_event_sessions.schedule_note is
  '日程の補足（複数日開催など）。入力時は公開画面で日時の代わりに表示';

create index if not exists melatonin_yoga_event_sessions_published_starts_idx
  on public.melatonin_yoga_event_sessions (published, event_type, starts_at);

-- ------------------------------------------------------------
-- 申込本体
-- ------------------------------------------------------------

create table if not exists public.melatonin_yoga_registrations (
  id uuid primary key default gen_random_uuid(),
  name_kanji text not null,
  name_kana text not null,
  email text not null,
  phone text not null,
  training_format text,
  has_yoga_experience boolean not null,
  message text not null default '',
  referral_source text,
  status text not null default 'new',
  admin_memo text not null default '',
  submitter_ip text not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint melatonin_yoga_registrations_name_kanji_not_blank
    check (btrim(name_kanji) <> ''),
  constraint melatonin_yoga_registrations_name_kana_not_blank
    check (btrim(name_kana) <> ''),
  constraint melatonin_yoga_registrations_email_not_blank
    check (btrim(email) <> ''),
  constraint melatonin_yoga_registrations_phone_not_blank
    check (btrim(phone) <> ''),
  constraint melatonin_yoga_registrations_training_format_check
    check (
      training_format is null
      or training_format in ('online', 'in_person')
    ),
  constraint melatonin_yoga_registrations_status_check
    check (status in ('new', 'contacted', 'confirmed', 'cancelled'))
);

comment on table public.melatonin_yoga_registrations is
  'メラトニンヨガ™ 申込。status: new=新規, contacted=連絡済み, confirmed=参加確定, cancelled=キャンセル';
comment on column public.melatonin_yoga_registrations.training_format is
  '養成コース選択時の受講形式。online=オンライン, in_person=対面';
comment on column public.melatonin_yoga_registrations.submitter_ip is
  '連続送信制限用。申込 API がリクエストから取得した IP のみ設定。管理画面には出さない';

create index if not exists melatonin_yoga_registrations_status_submitted_idx
  on public.melatonin_yoga_registrations (status, submitted_at desc);

create index if not exists melatonin_yoga_registrations_ip_submitted_idx
  on public.melatonin_yoga_registrations (submitter_ip, submitted_at desc);

-- ------------------------------------------------------------
-- 申込 × 種別ごとの日程選択（種別あたり1件）
-- ------------------------------------------------------------

create table if not exists public.melatonin_yoga_registration_selections (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null
    references public.melatonin_yoga_registrations (id) on delete cascade,
  event_type text not null,
  session_id uuid
    references public.melatonin_yoga_event_sessions (id) on delete restrict,
  is_flexible boolean not null default false,
  created_at timestamptz not null default now(),
  constraint melatonin_yoga_registration_selections_event_type_check
    check (event_type in ('consultation', 'workshop', 'training_course')),
  constraint melatonin_yoga_registration_selections_one_per_type
    unique (registration_id, event_type),
  constraint melatonin_yoga_registration_selections_flexible_or_session
    check (
      (is_flexible = true and session_id is null)
      or (is_flexible = false and session_id is not null)
    )
);

comment on table public.melatonin_yoga_registration_selections is
  '申込ごとの種別選択。1申込につき各 event_type は最大1件（日程 or 日程が合わない）';
comment on column public.melatonin_yoga_registration_selections.is_flexible is
  'true=日程が合わない・個別相談希望';

create index if not exists melatonin_yoga_registration_selections_session_idx
  on public.melatonin_yoga_registration_selections (session_id)
  where session_id is not null;

-- ------------------------------------------------------------
-- updated_at トリガー
-- ------------------------------------------------------------

create or replace function public.melatonin_yoga_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists melatonin_yoga_event_sessions_set_updated_at
  on public.melatonin_yoga_event_sessions;
create trigger melatonin_yoga_event_sessions_set_updated_at
  before update on public.melatonin_yoga_event_sessions
  for each row
  execute function public.melatonin_yoga_set_updated_at();

drop trigger if exists melatonin_yoga_registrations_set_updated_at
  on public.melatonin_yoga_registrations;
create trigger melatonin_yoga_registrations_set_updated_at
  before update on public.melatonin_yoga_registrations
  for each row
  execute function public.melatonin_yoga_set_updated_at();

-- ------------------------------------------------------------
-- 定員カウント（cancelled 以外の申込のみ）
-- ------------------------------------------------------------

create or replace function public.melatonin_yoga_session_reserved_count(p_session_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.melatonin_yoga_registration_selections s
  join public.melatonin_yoga_registrations r on r.id = s.registration_id
  where s.session_id = p_session_id
    and s.is_flexible = false
    and r.status <> 'cancelled';
$$;

comment on function public.melatonin_yoga_session_reserved_count(uuid) is
  '日程の確保数。status が cancelled 以外の申込のみカウント';

-- ------------------------------------------------------------
-- 申込作成（申込本体 + 選択日程を原子的に保存）
-- ------------------------------------------------------------

create or replace function public.create_melatonin_yoga_registration(
  p_name_kanji text,
  p_name_kana text,
  p_email text,
  p_phone text,
  p_training_format text,
  p_has_yoga_experience boolean,
  p_message text,
  p_referral_source text,
  p_submitter_ip text,
  p_selections jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_id uuid;
  v_ip text;
  v_email text;
  v_recent_count integer;
  v_last_at timestamptz;
  v_elem jsonb;
  v_event_type text;
  v_session_id uuid;
  v_is_flexible boolean;
  v_seen_types text[] := '{}';
  v_session record;
  v_reserved integer;
  v_needs_training_format boolean := false;
begin
  -- IP レート制限
  if p_submitter_ip is null or btrim(p_submitter_ip) = '' then
    raise exception 'my_registration_rate_limited';
  end if;

  v_ip := left(btrim(p_submitter_ip), 64);
  perform pg_advisory_xact_lock(hashtext('melatonin_yoga:' || v_ip)::bigint);

  select max(submitted_at) into v_last_at
  from public.melatonin_yoga_registrations
  where submitter_ip = v_ip;

  if v_last_at is not null and v_last_at > now() - interval '60 seconds' then
    raise exception 'my_registration_rate_limited';
  end if;

  select count(*) into v_recent_count
  from public.melatonin_yoga_registrations
  where submitter_ip = v_ip
    and submitted_at > now() - interval '1 hour';

  if v_recent_count >= 5 then
    raise exception 'my_registration_rate_limited';
  end if;

  -- 申込者情報の正規化・検証
  if btrim(coalesce(p_name_kanji, '')) = ''
    or btrim(coalesce(p_name_kana, '')) = ''
    or btrim(coalesce(p_email, '')) = ''
    or btrim(coalesce(p_phone, '')) = ''
  then
    raise exception 'my_registration_invalid';
  end if;

  if p_has_yoga_experience is null then
    raise exception 'my_registration_invalid';
  end if;

  if p_selections is null
    or jsonb_typeof(p_selections) <> 'array'
    or jsonb_array_length(p_selections) < 1
  then
    raise exception 'my_registration_invalid';
  end if;

  v_email := lower(btrim(p_email));

  if p_training_format is not null
    and btrim(p_training_format) <> ''
    and btrim(p_training_format) not in ('online', 'in_person')
  then
    raise exception 'my_registration_invalid';
  end if;

  -- 選択内容の検証（種別の重複なし、flexible / session の整合）
  for v_elem in select value from jsonb_array_elements(p_selections)
  loop
    v_event_type := v_elem->>'event_type';
    v_is_flexible := coalesce((v_elem->>'is_flexible')::boolean, false);

    if v_event_type is null
      or v_event_type not in ('consultation', 'workshop', 'training_course')
    then
      raise exception 'my_registration_invalid';
    end if;

    if v_event_type = any (v_seen_types) then
      raise exception 'my_registration_invalid';
    end if;
    v_seen_types := array_append(v_seen_types, v_event_type);

    if v_is_flexible then
      if v_elem ? 'session_id' and v_elem->>'session_id' is not null then
        raise exception 'my_registration_invalid';
      end if;
    else
      begin
        v_session_id := (v_elem->>'session_id')::uuid;
      exception
        when invalid_text_representation then
          raise exception 'my_registration_invalid';
      end;

      if v_session_id is null then
        raise exception 'my_registration_invalid';
      end if;

      -- 定員チェック用に日程行をロック（同時申込でも定員超過を防ぐ）
      select *
      into v_session
      from public.melatonin_yoga_event_sessions
      where id = v_session_id
      for update;

      if not found then
        raise exception 'my_registration_session_not_found';
      end if;

      if v_session.event_type <> v_event_type then
        raise exception 'my_registration_invalid';
      end if;

      if v_session.published is not true or v_session.registration_closed is true then
        raise exception 'my_registration_session_closed';
      end if;

      v_reserved := public.melatonin_yoga_session_reserved_count(v_session_id);
      if v_reserved >= v_session.capacity then
        raise exception 'my_registration_session_full';
      end if;
    end if;

    if v_event_type = 'training_course' then
      v_needs_training_format := true;
    end if;
  end loop;

  if v_needs_training_format
    and (p_training_format is null or btrim(p_training_format) = '')
  then
    raise exception 'my_registration_training_format_required';
  end if;

  -- 申込本体を挿入
  insert into public.melatonin_yoga_registrations (
    name_kanji,
    name_kana,
    email,
    phone,
    training_format,
    has_yoga_experience,
    message,
    referral_source,
    submitter_ip
  )
  values (
    btrim(p_name_kanji),
    btrim(p_name_kana),
    v_email,
    btrim(p_phone),
    case
      when p_training_format is null or btrim(p_training_format) = '' then null
      else btrim(p_training_format)
    end,
    p_has_yoga_experience,
    coalesce(btrim(p_message), ''),
    nullif(btrim(coalesce(p_referral_source, '')), ''),
    v_ip
  )
  returning id into v_registration_id;

  -- 選択日程を挿入
  for v_elem in select value from jsonb_array_elements(p_selections)
  loop
    v_event_type := v_elem->>'event_type';
    v_is_flexible := coalesce((v_elem->>'is_flexible')::boolean, false);

    if v_is_flexible then
      insert into public.melatonin_yoga_registration_selections (
        registration_id,
        event_type,
        session_id,
        is_flexible
      )
      values (
        v_registration_id,
        v_event_type,
        null,
        true
      );
    else
      v_session_id := (v_elem->>'session_id')::uuid;

      insert into public.melatonin_yoga_registration_selections (
        registration_id,
        event_type,
        session_id,
        is_flexible
      )
      values (
        v_registration_id,
        v_event_type,
        v_session_id,
        false
      );
    end if;
  end loop;

  return v_registration_id;
end;
$$;

comment on function public.create_melatonin_yoga_registration(
  text, text, text, text, text, boolean, text, text, text, jsonb
) is
  'メラトニンヨガ申込を原子的に作成。service_role のみ実行可。p_submitter_ip は API がリクエストから取得した値';

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.melatonin_yoga_event_sessions enable row level security;
alter table public.melatonin_yoga_registrations enable row level security;
alter table public.melatonin_yoga_registration_selections enable row level security;

-- 開催日程: 管理画面のみ（公開フォームはサーバー API が公開項目のみ返却）
drop policy if exists "melatonin_yoga_event_sessions_select_public"
  on public.melatonin_yoga_event_sessions;

drop policy if exists "melatonin_yoga_event_sessions_admin_all"
  on public.melatonin_yoga_event_sessions;
create policy "melatonin_yoga_event_sessions_admin_all"
  on public.melatonin_yoga_event_sessions for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- 申込: 管理画面のみ SELECT / UPDATE（INSERT は RPC のみ）
drop policy if exists "melatonin_yoga_registrations_select_admin"
  on public.melatonin_yoga_registrations;
create policy "melatonin_yoga_registrations_select_admin"
  on public.melatonin_yoga_registrations for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "melatonin_yoga_registrations_update_admin"
  on public.melatonin_yoga_registrations;
create policy "melatonin_yoga_registrations_update_admin"
  on public.melatonin_yoga_registrations for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- 選択: 管理画面のみ SELECT（INSERT は RPC のみ）
drop policy if exists "melatonin_yoga_registration_selections_select_admin"
  on public.melatonin_yoga_registration_selections;
create policy "melatonin_yoga_registration_selections_select_admin"
  on public.melatonin_yoga_registration_selections for select
  to authenticated
  using (public.is_admin_or_above());

-- ------------------------------------------------------------
-- GRANT
-- ------------------------------------------------------------

grant select, insert, update, delete on public.melatonin_yoga_event_sessions to authenticated;

grant select, update on public.melatonin_yoga_registrations to authenticated;
grant select on public.melatonin_yoga_registration_selections to authenticated;

revoke all on function public.create_melatonin_yoga_registration(
  text, text, text, text, text, boolean, text, text, text, jsonb
) from public;
revoke all on function public.create_melatonin_yoga_registration(
  text, text, text, text, text, boolean, text, text, text, jsonb
) from anon, authenticated;
grant execute on function public.create_melatonin_yoga_registration(
  text, text, text, text, text, boolean, text, text, text, jsonb
) to service_role;

revoke all on function public.melatonin_yoga_session_reserved_count(uuid) from public;
revoke all on function public.melatonin_yoga_session_reserved_count(uuid)
  from anon, authenticated;
grant execute on function public.melatonin_yoga_session_reserved_count(uuid)
  to service_role;
