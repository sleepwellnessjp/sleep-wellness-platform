-- ============================================================
-- sleep-content-images に SVG を許可（idempotent）
-- SQL Editor で手動実行してください
-- 表示は必ず <img> タグ。inline SVG 展開は禁止
-- ============================================================

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml'
]
where id = 'sleep-content-images';
