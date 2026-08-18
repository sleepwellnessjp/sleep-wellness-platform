-- ============================================================
-- 公開睡眠コンテンツ（/sleep）
-- SQL Editor で実行可（idempotent）
-- Migration: 20260817160000_sleep_content
-- ログイン不要の公開記事・動画・自然音。管理は /admin/sleep-content
-- ============================================================

create table if not exists public.sleep_contents (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  category text not null,
  subcategory text,
  kind text not null,
  title text not null,
  summary text not null default '',
  body_blocks jsonb not null default '[]'::jsonb,
  youtube_url text not null default '',
  audio_url text not null default '',
  cover_image_url text not null default '',
  duration_seconds integer,
  sort_order integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sleep_contents_slug_unique unique (slug),
  constraint sleep_contents_slug_not_blank
    check (btrim(slug) <> ''),
  constraint sleep_contents_title_not_blank
    check (btrim(title) <> ''),
  constraint sleep_contents_category_check
    check (category in ('rest', 'science', 'interview')),
  constraint sleep_contents_kind_check
    check (kind in (
      'talk_video',
      'nature_sound',
      'practice_video',
      'sleep_music',
      'article',
      'interview'
    )),
  constraint sleep_contents_category_kind_check
    check (
      (category = 'rest' and kind in ('talk_video', 'nature_sound', 'practice_video', 'sleep_music'))
      or (category = 'science' and kind = 'article')
      or (category = 'interview' and kind = 'interview')
    ),
  constraint sleep_contents_subcategory_check
    check (
      (
        category = 'science'
        and subcategory in ('basic', 'practice', 'life', 'women', 'men', 'work')
      )
      or (category <> 'science' and subcategory is null)
    ),
  constraint sleep_contents_body_blocks_is_array
    check (jsonb_typeof(body_blocks) = 'array')
);

comment on table public.sleep_contents is
  '公開睡眠コンテンツ（入眠 / 睡眠学 / インタビュー）。下書きは非公開';
comment on column public.sleep_contents.slug is
  '管理用キー。睡眠学の公開URL /sleep/science/[slug] に使用。入眠・インタビューの個別URLは未使用';
comment on column public.sleep_contents.category is
  'rest=入眠 / science=睡眠学 / interview=インタビュー';
comment on column public.sleep_contents.subcategory is
  '睡眠学のみ: basic / practice / life / women / men / work';
comment on column public.sleep_contents.kind is
  'talk_video / nature_sound / practice_video / sleep_music / article / interview';
comment on column public.sleep_contents.body_blocks is
  '記事本文のブロック配列。type は heading / paragraph / figure / list / callout';
comment on column public.sleep_contents.youtube_url is
  'YouTube限定公開URL。iframe HTML は保存しない';
comment on column public.sleep_contents.audio_url is
  '自然音の Storage 公開URL';
comment on column public.sleep_contents.published is
  'status=published のとき true。公開面の絞り込み用';

create index if not exists sleep_contents_public_idx
  on public.sleep_contents (category, subcategory, sort_order)
  where published = true and status = 'published';

create index if not exists sleep_contents_admin_idx
  on public.sleep_contents (category, subcategory, sort_order, updated_at desc);

create or replace function public.touch_sleep_content()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.published := (new.status = 'published');
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists sleep_contents_touch on public.sleep_contents;
create trigger sleep_contents_touch
  before insert or update on public.sleep_contents
  for each row
  execute function public.touch_sleep_content();

alter table public.sleep_contents enable row level security;

drop policy if exists "sleep_contents_select_public" on public.sleep_contents;
create policy "sleep_contents_select_public"
  on public.sleep_contents for select
  to anon, authenticated
  using (published = true and status = 'published');

drop policy if exists "sleep_contents_select_admin" on public.sleep_contents;
create policy "sleep_contents_select_admin"
  on public.sleep_contents for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "sleep_contents_insert_admin" on public.sleep_contents;
create policy "sleep_contents_insert_admin"
  on public.sleep_contents for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "sleep_contents_update_admin" on public.sleep_contents;
create policy "sleep_contents_update_admin"
  on public.sleep_contents for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "sleep_contents_delete_admin" on public.sleep_contents;
create policy "sleep_contents_delete_admin"
  on public.sleep_contents for delete
  to authenticated
  using (public.is_admin_or_above());

grant select on public.sleep_contents to anon, authenticated;
grant insert, update, delete on public.sleep_contents to authenticated;

-- Storage: 図解・カバー画像
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sleep-content-images',
  'sleep-content-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sleep_content_images_public_read" on storage.objects;
create policy "sleep_content_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'sleep-content-images');

drop policy if exists "sleep_content_images_admin_all" on storage.objects;
create policy "sleep_content_images_admin_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'sleep-content-images'
    and public.is_admin_or_above()
  )
  with check (
    bucket_id = 'sleep-content-images'
    and public.is_admin_or_above()
  );

-- Storage: 自然音（長尺 mp3 を想定し 50MB）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sleep-content-audio',
  'sleep-content-audio',
  true,
  52428800,
  array[
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'audio/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sleep_content_audio_public_read" on storage.objects;
create policy "sleep_content_audio_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'sleep-content-audio');

drop policy if exists "sleep_content_audio_admin_all" on storage.objects;
create policy "sleep_content_audio_admin_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'sleep-content-audio'
    and public.is_admin_or_above()
  )
  with check (
    bucket_id = 'sleep-content-audio'
    and public.is_admin_or_above()
  );

-- 下書きの初期行（タイトルと分類のみ。再実行で本文を上書きしない）
insert into public.sleep_contents (
  slug,
  category,
  subcategory,
  kind,
  title,
  sort_order,
  status
)
values
  ('talk-01', 'rest', null, 'talk_video', '語りかけ 01', 1, 'draft'),
  ('talk-02', 'rest', null, 'talk_video', '語りかけ 02', 2, 'draft'),
  ('talk-03', 'rest', null, 'talk_video', '語りかけ 03', 3, 'draft'),
  ('talk-04', 'rest', null, 'talk_video', '語りかけ 04', 4, 'draft'),
  ('talk-05', 'rest', null, 'talk_video', '語りかけ 05', 5, 'draft'),
  ('nature-01', 'rest', null, 'nature_sound', '自然音 01', 6, 'draft'),
  ('nature-02', 'rest', null, 'nature_sound', '自然音 02', 7, 'draft'),
  ('nature-03', 'rest', null, 'nature_sound', '自然音 03', 8, 'draft'),
  ('nature-04', 'rest', null, 'nature_sound', '自然音 04', 9, 'draft'),
  ('nature-05', 'rest', null, 'nature_sound', '自然音 05', 10, 'draft'),
  ('nature-06', 'rest', null, 'nature_sound', '自然音 06', 11, 'draft'),
  ('nature-07', 'rest', null, 'nature_sound', '自然音 07', 12, 'draft'),
  ('nature-08', 'rest', null, 'nature_sound', '自然音 08', 13, 'draft'),
  ('nature-09', 'rest', null, 'nature_sound', '自然音 09', 14, 'draft'),
  ('nature-10', 'rest', null, 'nature_sound', '自然音 10', 15, 'draft'),
  ('bedtime-melatonin-yoga', 'rest', null, 'practice_video', '寝る前の15分メラトニンヨガ™', 16, 'draft'),
  ('autonomic-nervous-system', 'science', 'basic', 'article', '自律神経とは？', 1, 'draft'),
  ('hrv-and-heart-rate', 'science', 'basic', 'article', '心拍変動と心拍数の関係', 2, 'draft'),
  ('what-is-melatonin', 'science', 'basic', 'article', 'メラトニンとは？', 3, 'draft'),
  ('sleep-hormones', 'science', 'basic', 'article', '睡眠系ホルモンとは？', 4, 'draft'),
  ('what-is-stress', 'science', 'basic', 'article', 'ストレスとは？', 5, 'draft'),
  ('sleep-and-meditation', 'science', 'practice', 'article', '睡眠と瞑想の関係', 1, 'draft'),
  ('types-of-meditation', 'science', 'practice', 'article', '瞑想の種類', 2, 'draft'),
  ('sleep-and-breathing', 'science', 'practice', 'article', '睡眠と呼吸法の関係', 3, 'draft'),
  ('bath-yoga-and-sleep', 'science', 'practice', 'article', 'かんたんお風呂ヨガと睡眠', 4, 'draft'),
  ('sleep-as-life-foundation', 'science', 'life', 'article', '睡眠が人生の土台を作るとは？', 1, 'draft'),
  ('alcohol-and-sleep', 'science', 'life', 'article', '飲酒と睡眠', 2, 'draft'),
  ('night-waking-and-sleep', 'science', 'life', 'article', '中途覚醒と睡眠', 3, 'draft'),
  ('children-and-sleep', 'science', 'life', 'article', '子どもと睡眠', 4, 'draft'),
  ('adults-and-sleep', 'science', 'life', 'article', '大人と睡眠', 5, 'draft'),
  ('older-adults-and-sleep', 'science', 'life', 'article', '高齢者と睡眠', 6, 'draft'),
  ('menopause-and-sleep', 'science', 'women', 'article', '更年期と睡眠', 1, 'draft'),
  ('menstruation-and-sleep', 'science', 'women', 'article', '月経と睡眠', 2, 'draft'),
  ('beauty-and-sleep', 'science', 'women', 'article', '美容と睡眠', 3, 'draft'),
  ('strength-training-and-sleep', 'science', 'men', 'article', '筋トレと睡眠', 1, 'draft'),
  ('memory-and-sleep', 'science', 'work', 'article', '記憶力と睡眠', 1, 'draft'),
  ('work-performance-and-sleep', 'science', 'work', 'article', '仕事の効率と睡眠', 2, 'draft'),
  ('interview-a', 'interview', null, 'interview', 'インタビュー A', 1, 'draft'),
  ('interview-b', 'interview', null, 'interview', 'インタビュー B', 2, 'draft'),
  ('interview-c', 'interview', null, 'interview', 'インタビュー C', 3, 'draft')
on conflict (slug) do nothing;

-- 既存DB向け: sleep_music を kind 制約に追加（idempotent）
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

