-- ============================================================
-- client_guidance_notes — クライアント詳細の日時付き指導メモ
-- Migration: 20260722170000_client_guidance_notes
-- ============================================================

create table if not exists public.client_guidance_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null
    references public.clients (id) on delete cascade,
  owner_id uuid not null
    references auth.users (id) on delete cascade,
  content text not null default '',
  note_date date not null default (timezone('Asia/Tokyo', now()))::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_guidance_notes_content_not_blank
    check (btrim(content) <> '')
);

create index if not exists client_guidance_notes_client_date_idx
  on public.client_guidance_notes (client_id, note_date desc, created_at desc);

create index if not exists client_guidance_notes_owner_idx
  on public.client_guidance_notes (owner_id);

comment on table public.client_guidance_notes is
  'クライアント詳細の指導メモ（日時付き・時系列）。clients.memo（担当者メモ）とは別。';
comment on column public.client_guidance_notes.note_date is
  'メモの指導日（表示・時系列ソート用）。';
comment on column public.client_guidance_notes.content is
  '指導メモ本文。';

drop trigger if exists client_guidance_notes_set_updated_at
  on public.client_guidance_notes;
create trigger client_guidance_notes_set_updated_at
before update on public.client_guidance_notes
for each row execute function public.set_updated_at();

alter table public.client_guidance_notes enable row level security;

drop policy if exists "client_guidance_notes_select_own"
  on public.client_guidance_notes;
create policy "client_guidance_notes_select_own"
  on public.client_guidance_notes for select
  using (auth.uid() = owner_id);

drop policy if exists "client_guidance_notes_insert_own"
  on public.client_guidance_notes;
create policy "client_guidance_notes_insert_own"
  on public.client_guidance_notes for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = auth.uid()
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
      where c.id = client_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "client_guidance_notes_delete_own"
  on public.client_guidance_notes;
create policy "client_guidance_notes_delete_own"
  on public.client_guidance_notes for delete
  using (auth.uid() = owner_id);
