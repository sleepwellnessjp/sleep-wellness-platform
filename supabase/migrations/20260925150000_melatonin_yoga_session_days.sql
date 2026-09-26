-- ============================================================
-- メラトニンヨガ開催日程: 開催日（複数日対応）
-- 親の starts_at / ends_at は開催日から自動同期。
-- 保存は save_melatonin_yoga_event_session() で原子的に行う。
-- ============================================================

-- ------------------------------------------------------------
-- 開催日
-- ------------------------------------------------------------

create table if not exists public.melatonin_yoga_session_days (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.melatonin_yoga_event_sessions (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  constraint melatonin_yoga_session_days_ends_after_starts
    check (ends_at > starts_at),
  constraint melatonin_yoga_session_days_sort_order_positive
    check (sort_order > 0),
  constraint melatonin_yoga_session_days_unique_sort
    unique (session_id, sort_order)
);

comment on table public.melatonin_yoga_session_days is
  'メラトニンヨガ開催日程の各開催日。1日程につき1日以上';
comment on column public.melatonin_yoga_session_days.sort_order is
  '開催日の並び順（1始まり）';

create index if not exists melatonin_yoga_session_days_session_sort_idx
  on public.melatonin_yoga_session_days (session_id, sort_order);

comment on column public.melatonin_yoga_event_sessions.schedule_note is
  '日程の補足（開催日一覧の下に表示する一言）';

-- ------------------------------------------------------------
-- 既存データ移行（starts_at / ends_at → 開催日1件）
-- ------------------------------------------------------------

insert into public.melatonin_yoga_session_days (
  session_id,
  starts_at,
  ends_at,
  sort_order
)
select
  s.id,
  s.starts_at,
  coalesce(s.ends_at, s.starts_at + interval '2 hours'),
  1
from public.melatonin_yoga_event_sessions s
where not exists (
  select 1
  from public.melatonin_yoga_session_days d
  where d.session_id = s.id
);

update public.melatonin_yoga_event_sessions s
set ends_at = d.ends_at
from public.melatonin_yoga_session_days d
where d.session_id = s.id
  and d.sort_order = 1
  and s.ends_at is null;

-- ------------------------------------------------------------
-- 開催日程 + 開催日を原子的に保存
-- ------------------------------------------------------------

create or replace function public.save_melatonin_yoga_event_session(
  p_id uuid,
  p_event_type text,
  p_format text,
  p_location text,
  p_capacity integer,
  p_registration_closed boolean,
  p_published boolean,
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

  -- 開催日の検証と sort_order 用に starts_at でソート
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
  uuid, text, text, text, integer, boolean, boolean, text, text, jsonb
) is
  '開催日程と開催日を原子的に保存。親の starts_at / ends_at を自動同期';

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.melatonin_yoga_session_days enable row level security;

drop policy if exists "melatonin_yoga_session_days_admin_all"
  on public.melatonin_yoga_session_days;
create policy "melatonin_yoga_session_days_admin_all"
  on public.melatonin_yoga_session_days for all
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ------------------------------------------------------------
-- GRANT
-- ------------------------------------------------------------

grant select, insert, update, delete on public.melatonin_yoga_session_days
  to authenticated;

revoke all on function public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, text, text, jsonb
) from public;
grant execute on function public.save_melatonin_yoga_event_session(
  uuid, text, text, text, integer, boolean, boolean, text, text, jsonb
) to authenticated;
