-- Ensure analyses.analysis_date + structured OCR columns exist
-- (idempotent repair for environments that missed 20260721100000)

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

update public.analyses
set analysis_date = (analyzed_at at time zone 'Asia/Tokyo')::date
where analysis_date is null;

create index if not exists analyses_client_analysis_date_idx
  on public.analyses (client_id, analysis_date desc nulls last);

notify pgrst, 'reload schema';
