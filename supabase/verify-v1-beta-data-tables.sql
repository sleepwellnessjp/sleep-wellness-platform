-- ============================================================
-- Version 1.0 Beta — migration 適用後の確認用 SQL
-- SQL Editor で実行し、結果を確認してください。
-- ============================================================

-- 1) 必須テーブルの存在
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'clients',
    'sleep_analyses',
    'sleep_journeys',
    'homework',
    'follow_up_records',
    'reports'
  )
order by table_name;

-- 2) clients の Beta 列
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clients'
  and column_name in ('age', 'start_date', 'next_follow_up_date', 'current_sleep_score', 'instructor_id')
order by column_name;

-- 3) RLS 有効化
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'clients',
    'sleep_analyses',
    'sleep_journeys',
    'homework',
    'follow_up_records',
    'reports'
  )
order by c.relname;

-- 4) ポリシー一覧
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'sleep_analyses',
    'sleep_journeys',
    'homework',
    'follow_up_records',
    'reports'
  )
order by tablename, policyname;

-- 5) インデックス
select tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'sleep_analyses',
    'sleep_journeys',
    'homework',
    'follow_up_records',
    'reports'
  )
order by tablename, indexname;

-- 6) ヘルパー関数
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname = 'beta_owns_client';

-- 7) Beta Test クライアントの後片付け（確認後に実行）
-- delete from public.clients where name ilike '%Beta Test%';
