-- ============================================================
-- メラトニンヨガ: アーカイブ受講対応
-- 前提: 20260925150000_melatonin_yoga_session_days.sql を適用済みであること
-- ============================================================

-- ------------------------------------------------------------
-- 開催日程: アーカイブ受講可
-- ------------------------------------------------------------

alter table public.melatonin_yoga_event_sessions
  add column if not exists archive_available boolean not null default false;

comment on column public.melatonin_yoga_event_sessions.archive_available is
  'true の場合、養成コース申込でアーカイブ受講を選択可能';

-- ------------------------------------------------------------
-- 申込: training_format に archive を追加
-- ------------------------------------------------------------

alter table public.melatonin_yoga_registrations
  drop constraint if exists melatonin_yoga_registrations_training_format_check;

alter table public.melatonin_yoga_registrations
  add constraint melatonin_yoga_registrations_training_format_check
    check (
      training_format is null
      or training_format in ('online', 'in_person', 'archive')
    );

comment on column public.melatonin_yoga_registrations.training_format is
  '養成コース選択時の受講形式。online=オンライン, in_person=対面, archive=アーカイブ';

-- ------------------------------------------------------------
-- save_melatonin_yoga_event_session（archive_available 追加）
-- ------------------------------------------------------------

drop function if exists public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, text, text, jsonb
);

create or replace function public.save_melatonin_yoga_event_session(
  p_id uuid,
  p_event_type text,
  p_format text,
  p_location text,
  p_capacity integer,
  p_registration_closed boolean,
  p_published boolean,
  p_archive_available boolean,
  p_admin_note text,
  p_schedule_note text,
  p_days jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_elem jsonb;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_day_starts timestamptz;
  v_day_ends timestamptz;
  v_sort integer := 0;
  v_first_starts timestamptz;
  v_last_ends timestamptz;
begin
  if not public.is_admin_or_above() then
    raise exception 'Forbidden';
  end if;

  if p_event_type is null
    or p_event_type not in ('consultation', 'workshop', 'training_course')
  then
    raise exception 'my_session_invalid';
  end if;

  if p_format is null
    or p_format not in ('online', 'in_person', 'hybrid')
  then
    raise exception 'my_session_invalid';
  end if;

  if p_capacity is null or p_capacity < 1 then
    raise exception 'my_session_invalid';
  end if;

  if p_days is null
    or jsonb_typeof(p_days) <> 'array'
    or jsonb_array_length(p_days) < 1
  then
    raise exception 'my_session_days_required';
  end if;

  for v_elem in
    select value
    from jsonb_array_elements(p_days)
    order by (value->>'starts_at')::timestamptz
  loop
    begin
      v_day_starts := (v_elem->>'starts_at')::timestamptz;
      v_day_ends := (v_elem->>'ends_at')::timestamptz;
    exception
      when invalid_text_representation then
        raise exception 'my_session_invalid';
    end;

    if v_day_starts is null or v_day_ends is null then
      raise exception 'my_session_day_times_required';
    end if;

    if v_day_ends <= v_day_starts then
      raise exception 'my_session_day_ends_before_starts';
    end if;

    v_sort := v_sort + 1;
    if v_sort = 1 then
      v_first_starts := v_day_starts;
    end if;
    v_last_ends := v_day_ends;
  end loop;

  v_starts_at := v_first_starts;
  v_ends_at := v_last_ends;

  if p_id is null then
    insert into public.melatonin_yoga_event_sessions (
      event_type,
      starts_at,
      ends_at,
      format,
      location,
      capacity,
      registration_closed,
      published,
      archive_available,
      admin_note,
      schedule_note
    )
    values (
      p_event_type,
      v_starts_at,
      v_ends_at,
      p_format,
      coalesce(btrim(p_location), ''),
      p_capacity,
      coalesce(p_registration_closed, false),
      coalesce(p_published, false),
      coalesce(p_archive_available, false),
      coalesce(btrim(p_admin_note), ''),
      coalesce(btrim(p_schedule_note), '')
    )
    returning id into v_session_id;
  else
    v_session_id := p_id;

    if not exists (
      select 1 from public.melatonin_yoga_event_sessions where id = v_session_id
    ) then
      raise exception 'my_session_not_found';
    end if;

    update public.melatonin_yoga_event_sessions
    set
      event_type = p_event_type,
      starts_at = v_starts_at,
      ends_at = v_ends_at,
      format = p_format,
      location = coalesce(btrim(p_location), ''),
      capacity = p_capacity,
      registration_closed = coalesce(p_registration_closed, false),
      published = coalesce(p_published, false),
      archive_available = coalesce(p_archive_available, false),
      admin_note = coalesce(btrim(p_admin_note), ''),
      schedule_note = coalesce(btrim(p_schedule_note), ''),
      updated_at = now()
    where id = v_session_id;

    delete from public.melatonin_yoga_session_days
    where session_id = v_session_id;
  end if;

  v_sort := 0;
  for v_elem in
    select value
    from jsonb_array_elements(p_days)
    order by (value->>'starts_at')::timestamptz
  loop
    v_day_starts := (v_elem->>'starts_at')::timestamptz;
    v_day_ends := (v_elem->>'ends_at')::timestamptz;
    v_sort := v_sort + 1;

    insert into public.melatonin_yoga_session_days (
      session_id,
      starts_at,
      ends_at,
      sort_order
    )
    values (
      v_session_id,
      v_day_starts,
      v_day_ends,
      v_sort
    );
  end loop;

  return v_session_id;
end;
$$;

comment on function public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, boolean, text, text, jsonb
) is
  '開催日程と開催日を原子的に保存。親の starts_at / ends_at を自動同期';

revoke all on function public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, boolean, text, text, jsonb
) from public;
grant execute on function public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, boolean, text, text, jsonb
) to authenticated;

-- ------------------------------------------------------------
-- create_melatonin_yoga_registration（受講形式の検証更新）
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
  v_training_flexible boolean := false;
  v_training_session_format text;
  v_training_archive_available boolean := false;
  v_training_format text;
begin
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
    and btrim(p_training_format) not in ('online', 'in_person', 'archive')
  then
    raise exception 'my_registration_invalid';
  end if;

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

      if v_event_type = 'training_course' then
        v_needs_training_format := true;
        v_training_flexible := true;
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

      if v_event_type = 'training_course' then
        v_needs_training_format := true;
        v_training_flexible := false;
        v_training_session_format := v_session.format;
        v_training_archive_available := coalesce(v_session.archive_available, false);
      end if;
    end if;
  end loop;

  if v_needs_training_format
    and (p_training_format is null or btrim(p_training_format) = '')
  then
    raise exception 'my_registration_training_format_required';
  end if;

  if v_needs_training_format then
    v_training_format := btrim(p_training_format);

    if v_training_flexible then
      if v_training_format not in ('online', 'in_person', 'archive') then
        raise exception 'my_registration_training_format_invalid';
      end if;
    else
      if v_training_format = 'archive' then
        if not v_training_archive_available then
          raise exception 'my_registration_training_format_invalid';
        end if;
      elsif v_training_session_format = 'online' then
        if v_training_format <> 'online' then
          raise exception 'my_registration_training_format_invalid';
        end if;
      elsif v_training_session_format = 'in_person' then
        if v_training_format <> 'in_person' then
          raise exception 'my_registration_training_format_invalid';
        end if;
      elsif v_training_session_format = 'hybrid' then
        if v_training_format not in ('online', 'in_person') then
          raise exception 'my_registration_training_format_invalid';
        end if;
      else
        raise exception 'my_registration_training_format_invalid';
      end if;
    end if;
  end if;

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
  'メラトニンヨガ申込を原子的に作成。service_role のみ実行可。養成コースの受講形式は日程に応じて検証';
