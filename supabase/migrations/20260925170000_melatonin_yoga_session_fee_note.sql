-- ============================================================
-- メラトニンヨガ: 開催日程に参加費（自由記入）を追加
-- 前提: 20260925160000_melatonin_yoga_archive_available.sql を適用済みであること
-- ============================================================

alter table public.melatonin_yoga_event_sessions
  add column if not exists fee_note text not null default '';

comment on column public.melatonin_yoga_event_sessions.fee_note is
  '参加費・受講料の表示用（例：無料、3,000円（税込））';

-- ------------------------------------------------------------
-- save_melatonin_yoga_event_session（fee_note 追加）
-- ------------------------------------------------------------

drop function if exists public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, boolean, text, text, jsonb
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
  p_fee_note text,
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
      schedule_note,
      fee_note
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
      coalesce(btrim(p_schedule_note), ''),
      coalesce(btrim(p_fee_note), '')
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
      fee_note = coalesce(btrim(p_fee_note), ''),
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
  uuid, text, text, text, integer, boolean, boolean, boolean, text, text, text, jsonb
) is
  '開催日程と開催日を原子的に保存。親の starts_at / ends_at を自動同期';

revoke all on function public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, boolean, text, text, text, jsonb
) from public;

revoke all on function public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, boolean, text, text, text, jsonb
) from anon;

grant execute on function public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, boolean, text, text, text, jsonb
) to authenticated;
