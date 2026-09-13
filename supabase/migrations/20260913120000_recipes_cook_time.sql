-- ============================================================
-- recipes: 調理時間カラム追加
-- Migration: 20260913120000_recipes_cook_time
-- ============================================================

alter table public.recipes
  add column if not exists cook_time text;

comment on column public.recipes.cook_time is
  '調理時間。自由記述（例: 約20分）。NULL 可';
