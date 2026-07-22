-- ============================================================
-- client_homeworks — 認定講師が設定するクライアント宿題
-- Migration: 20260722210000_client_homeworks
-- ============================================================

create table if not exists public.client_homeworks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  instructor_id uuid not null
    references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  assigned_date date not null
    default (timezone('Asia/Tokyo', now()))::date,
  due_date date not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_homeworks_title_not_blank
    check (btrim(title) <> ''),
  constraint client_homeworks_due_gte_assigned
    check (due_date >= assigned_date)
);

create index if not exists client_homeworks_client_due_idx
  on public.client_homeworks (client_id, due_date desc, assigned_date desc);

create index if not exists client_homeworks_instructor_idx
  on public.client_homeworks (instructor_id);

create index if not exists client_homeworks_client_completed_idx
  on public.client_homeworks (client_id, is_completed, completed_at desc);

comment on table public.client_homeworks is
  '認定講師がクライアントに設定する宿題。AI宿題（analyses.ai_result）とは別。';
comment on column public.client_homeworks.assigned_date is
  '開始日（表示・「今日の宿題」判定用）';
comment on column public.client_homeworks.due_date is
  '期限日。達成率の分母は期限到来分のみ。';
comment on column public.client_homeworks.is_completed is
  'クライアント本人がチェックした完了状態';
comment on column public.client_homeworks.completed_at is
  '完了にした時刻（解除時は null）';

drop trigger if exists client_homeworks_set_updated_at
  on public.client_homeworks;
create trigger client_homeworks_set_updated_at
before update on public.client_homeworks
for each row execute function public.set_updated_at();

alter table public.client_homeworks enable row level security;

-- 認定講師: 自分の担当クライアントの宿題のみ CRUD
drop policy if exists "client_homeworks_select_instructor"
  on public.client_homeworks;
create policy "client_homeworks_select_instructor"
  on public.client_homeworks for select
  using (auth.uid() = instructor_id);

drop policy if exists "client_homeworks_insert_instructor"
  on public.client_homeworks;
create policy "client_homeworks_insert_instructor"
  on public.client_homeworks for insert
  with check (
    auth.uid() = instructor_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "client_homeworks_update_instructor"
  on public.client_homeworks;
create policy "client_homeworks_update_instructor"
  on public.client_homeworks for update
  using (auth.uid() = instructor_id)
  with check (
    auth.uid() = instructor_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "client_homeworks_delete_instructor"
  on public.client_homeworks;
create policy "client_homeworks_delete_instructor"
  on public.client_homeworks for delete
  using (auth.uid() = instructor_id);

-- クライアント本人: 自分に割り当てられた宿題のみ閲覧
drop policy if exists "client_homeworks_select_linked_client"
  on public.client_homeworks;
create policy "client_homeworks_select_linked_client"
  on public.client_homeworks for select
  using (public.is_linked_client(client_id));

-- クライアント本人の完了チェックは RPC 経由（他カラム改変を防ぐ）
create or replace function public.set_own_homework_completion(
  p_homework_id uuid,
  p_is_completed boolean
)
returns public.client_homeworks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.client_homeworks;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.client_homeworks
  where id = p_homework_id
  for update;

  if not found then
    raise exception 'homework not found or not allowed';
  end if;

  if not public.is_linked_client(v_row.client_id) then
    raise exception 'homework not found or not allowed';
  end if;

  update public.client_homeworks
    set
      is_completed = coalesce(p_is_completed, false),
      completed_at = case
        when coalesce(p_is_completed, false) then coalesce(completed_at, now())
        else null
      end
  where id = p_homework_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.set_own_homework_completion(uuid, boolean) from public;
grant execute on function public.set_own_homework_completion(uuid, boolean) to authenticated;
