-- ============================================================
-- 睡眠レシピ（recipes）第1段
-- Migration: 20260910120000_recipes
-- 既存テーブルには影響しない。公開読取 + 管理者書込。
-- Storage バケット: recipe-images
-- ============================================================

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lead text,
  servings text,
  image_path text,
  ingredient_groups jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  one_point text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_title_not_blank
    check (btrim(title) <> ''),
  constraint recipes_ingredient_groups_is_array
    check (jsonb_typeof(ingredient_groups) = 'array'),
  constraint recipes_steps_is_array
    check (jsonb_typeof(steps) = 'array')
);

comment on table public.recipes is
  '睡眠レシピ。公開フラグが true の行のみ一般公開。管理は将来の /admin 画面を想定';
comment on column public.recipes.title is
  '料理名';
comment on column public.recipes.lead is
  'リード文。2〜3行の紹介';
comment on column public.recipes.servings is
  '何人前。「2人分」など自由記述';
comment on column public.recipes.image_path is
  'Storage バケット recipe-images 上のオブジェクトパス';
comment on column public.recipes.ingredient_groups is
  '材料グループ配列。例: [{ "label": "スパイス", "items": [{ "name": "...", "amount": "..." }] }]。label は省略可';
comment on column public.recipes.steps is
  '作り方。文字列の配列';
comment on column public.recipes.one_point is
  'ワンポイント。任意';
comment on column public.recipes.is_published is
  'true のとき公開面に表示';
comment on column public.recipes.sort_order is
  '一覧の並び順（昇順）';

create index if not exists recipes_public_idx
  on public.recipes (sort_order, created_at desc)
  where is_published = true;

create index if not exists recipes_admin_idx
  on public.recipes (sort_order, updated_at desc);

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before insert or update on public.recipes
  for each row
  execute function public.set_updated_at();

alter table public.recipes enable row level security;

-- 編集権限: public.is_admin_or_above()
-- = profiles.role in ('super_admin', 'admin') のみ。
-- instructor / client / school / enterprise は false（書込不可）。
-- 公開読取は is_published = true の SELECT のみ。

drop policy if exists "recipes_select_public" on public.recipes;
create policy "recipes_select_public"
  on public.recipes for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "recipes_select_admin" on public.recipes;
create policy "recipes_select_admin"
  on public.recipes for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "recipes_insert_admin" on public.recipes;
create policy "recipes_insert_admin"
  on public.recipes for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "recipes_update_admin" on public.recipes;
create policy "recipes_update_admin"
  on public.recipes for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "recipes_delete_admin" on public.recipes;
create policy "recipes_delete_admin"
  on public.recipes for delete
  to authenticated
  using (public.is_admin_or_above());

grant select on public.recipes to anon, authenticated;
grant insert, update, delete on public.recipes to authenticated;

-- Storage: レシピ画像（公開読取・管理者書込）
-- 書込は is_admin_or_above()（admin / super_admin のみ。instructor 不可）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "recipe_images_public_read" on storage.objects;
create policy "recipe_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'recipe-images');

drop policy if exists "recipe_images_admin_all" on storage.objects;
create policy "recipe_images_admin_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'recipe-images'
    and public.is_admin_or_above()
  )
  with check (
    bucket_id = 'recipe-images'
    and public.is_admin_or_above()
  );
