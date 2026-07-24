-- Sleep Wellness Platform — structured OCR fields + analysis_date
-- Migration: 20260721100000_analysis_structured_metrics

alter table public.analyses
  add column if not exists analysis_date date,
  add column if not exists sleep_onset_time text,
  add column if not exists wake_time text,
  add column if not exists skin_temperature_value text,
  add column if not exists skin_temperature_type text
    check (
      skin_temperature_type is null
      or skin_temperature_type in ('absolute', 'delta')
    ),
  add column if not exists skin_temperature_unit text not null default '℃',
  add column if not exists stress_average text,
  add column if not exists stress_level text,
  add column if not exists stress_series jsonb not null default '[]'::jsonb,
  add column if not exists ocr_source_images jsonb not null default '[]'::jsonb,
  add column if not exists ocr_confidence jsonb not null default '{}'::jsonb;

-- 既存行: analyzed_at から analysis_date を補完
update public.analyses
set analysis_date = (analyzed_at at time zone 'Asia/Tokyo')::date
where analysis_date is null;

create index if not exists analyses_client_analysis_date_idx
  on public.analyses (client_id, analysis_date desc nulls last);

comment on column public.analyses.sleep_onset_time is '入眠時刻 HH:mm（SOXAI OCR 正規化）';
comment on column public.analyses.wake_time is '起床時刻 HH:mm（SOXAI OCR 正規化）';
comment on column public.analyses.skin_temperature_type is 'absolute=絶対温度, delta=基準からの差分';
comment on column public.analyses.stress_series is 'ストレス時系列（グラフ OCR）';
comment on column public.analyses.ocr_source_images is 'OCR に使用した画像インデックス配列';
comment on column public.analyses.ocr_confidence is '項目別 OCR 信頼度（0-1）';

-- PostgREST schema cache を更新（PGRST204 防止）
notify pgrst, 'reload schema';
