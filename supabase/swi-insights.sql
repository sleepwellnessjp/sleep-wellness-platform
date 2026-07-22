-- ============================================================
-- Sleep Wellness Intelligence (SWI) — 手動適用用
-- Migration: 20260722260000_swi_insights
-- ============================================================

-- 集計向けインデックス
create index if not exists analyses_swi_client_analyzed_idx
  on public.analyses (client_id, analyzed_at desc);

create index if not exists analyses_swi_score_idx
  on public.analyses (sleep_score)
  where sleep_score is not null;

create index if not exists clients_swi_instructor_demo_idx
  on public.clients (instructor_id, gender, birth_date);

create index if not exists client_homeworks_swi_title_idx
  on public.client_homeworks (title, due_date, is_completed);

-- ------------------------------------------------------------
-- 匿名メトリクスビュー（PII 列を含まない）
-- ------------------------------------------------------------
create or replace view public.swi_anonymous_analysis_metrics
with (security_invoker = true)
as
select
  a.id as analysis_id,
  a.client_id,
  c.instructor_id,
  a.sleep_score,
  a.sleep_duration,
  a.sleep_efficiency,
  a.hrv,
  a.analyzed_at,
  a.created_at,
  case
    when c.birth_date is not null then
      date_part(
        'year',
        age(timezone('Asia/Tokyo', now())::date, c.birth_date)
      )::integer
    else null
  end as age_years,
  case
    when c.gender is null or btrim(c.gender) = '' then 'unknown'
    when c.gender ~* '(女|female|^f$)' then 'female'
    when c.gender ~* '(男|male|^m$)' then 'male'
    else 'other'
  end as gender_bucket
from public.analyses a
join public.clients c on c.id = a.client_id;

comment on view public.swi_anonymous_analysis_metrics is
  'SWI Insights 用の匿名分析メトリクス。氏名・連絡先などの PII は含まない。';

grant select on public.swi_anonymous_analysis_metrics to authenticated;

-- ------------------------------------------------------------
-- 宿題達成の匿名集計（タイトル単位・スコープ付き RPC）
-- ------------------------------------------------------------
create or replace function public.swi_homework_completion_by_title(
  p_instructor_id uuid default null
)
returns table (
  title text,
  assigned_count bigint,
  completed_count bigint,
  completion_rate numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    h.title,
    count(*)::bigint as assigned_count,
    count(*) filter (where h.is_completed)::bigint as completed_count,
    case
      when count(*) = 0 then null
      else round(
        (
          count(*) filter (where h.is_completed)::numeric
          / count(*)::numeric
        ) * 100,
        1
      )
    end as completion_rate
  from public.client_homeworks h
  where h.due_date <= (timezone('Asia/Tokyo', now()))::date
    and (
      p_instructor_id is null
      or h.instructor_id = p_instructor_id
    )
    and (
      public.is_admin_or_above()
      or h.instructor_id = auth.uid()
    )
  group by h.title
  order by completion_rate desc nulls last, assigned_count desc;
$$;

comment on function public.swi_homework_completion_by_title(uuid) is
  'SWI: 宿題タイトル別の実施率（匿名）。管理者は全体、講師は自分の担当分。';

grant execute on function public.swi_homework_completion_by_title(uuid)
  to authenticated;
