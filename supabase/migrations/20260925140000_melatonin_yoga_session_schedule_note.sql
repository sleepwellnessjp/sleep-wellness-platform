-- メラトニンヨガ開催日程: 複数日開催などの日程補足
alter table public.melatonin_yoga_event_sessions
  add column if not exists schedule_note text not null default '';

comment on column public.melatonin_yoga_event_sessions.schedule_note is
  '日程の補足（開催日一覧の下に表示する一言）';
