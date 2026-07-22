-- Sleep Wellness Platform — Client profile basics (age / gender / habits)
-- Run in Supabase SQL Editor if migration has not been applied yet.
-- Safe to re-run (IF NOT EXISTS / defaults).

alter table public.clients
  add column if not exists age integer
    check (age is null or (age >= 0 and age <= 130));

alter table public.clients
  add column if not exists height_cm numeric
    check (height_cm is null or (height_cm > 0 and height_cm < 300));

alter table public.clients
  add column if not exists weight_kg numeric
    check (weight_kg is null or (weight_kg > 0 and weight_kg < 500));

alter table public.clients
  add column if not exists medications text not null default '';

alter table public.clients
  add column if not exists drinking_habit text not null default '';

alter table public.clients
  add column if not exists exercise_habit text not null default '';

alter table public.clients
  add column if not exists snoring_nasal text not null default '';

alter table public.clients
  add column if not exists medical_history text not null default '';
