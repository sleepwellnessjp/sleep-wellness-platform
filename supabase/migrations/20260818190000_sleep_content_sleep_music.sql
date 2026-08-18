-- ============================================================
-- sleep_contents.kind に sleep_music（入眠音楽）を追加
-- SQL Editor で実行可（idempotent）
-- practice_video（メラトニンヨガ™）は残し、音楽とは分離する
-- ============================================================

alter table public.sleep_contents
  drop constraint if exists sleep_contents_kind_check;

alter table public.sleep_contents
  add constraint sleep_contents_kind_check
  check (kind in (
    'talk_video',
    'nature_sound',
    'practice_video',
    'sleep_music',
    'article',
    'interview'
  ));

alter table public.sleep_contents
  drop constraint if exists sleep_contents_category_kind_check;

alter table public.sleep_contents
  add constraint sleep_contents_category_kind_check
  check (
    (
      category = 'rest'
      and kind in ('talk_video', 'nature_sound', 'practice_video', 'sleep_music')
    )
    or (category = 'science' and kind = 'article')
    or (category = 'interview' and kind = 'interview')
  );

comment on column public.sleep_contents.kind is
  'talk_video / nature_sound / practice_video / sleep_music / article / interview';
