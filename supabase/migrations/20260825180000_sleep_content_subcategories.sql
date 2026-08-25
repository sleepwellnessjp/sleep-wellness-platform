-- ============================================================
-- sleep_contents.subcategory に meditation / voices を追加
-- SQL Editor で実行可（idempotent）
-- 既存レコードの subcategory 値は変更しない
-- ============================================================

alter table public.sleep_contents
  drop constraint if exists sleep_contents_subcategory_check;

alter table public.sleep_contents
  add constraint sleep_contents_subcategory_check
  check (
    (
      category = 'science'
      and subcategory in (
        'basic',
        'life',
        'practice',
        'women',
        'men',
        'work',
        'meditation',
        'voices'
      )
    )
    or (category <> 'science' and subcategory is null)
  );

comment on column public.sleep_contents.subcategory is
  '睡眠学のみ: basic / life / practice / women / men / work / meditation / voices';
