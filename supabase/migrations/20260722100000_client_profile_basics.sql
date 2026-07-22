-- Client basic profile fields for Medical Report accuracy
-- Migration: 20260722100000_client_profile_basics

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

comment on column public.clients.age is '年齢（必須推奨・分析時必須）';
comment on column public.clients.gender is '性別（必須推奨・分析時必須）';
comment on column public.clients.height_cm is '身長 cm（推奨）';
comment on column public.clients.weight_kg is '体重 kg（推奨）';
comment on column public.clients.medications is '服薬（任意）';
comment on column public.clients.drinking_habit is '飲酒習慣（任意・当日飲酒とは別）';
comment on column public.clients.exercise_habit is '運動習慣（任意・当日運動とは別）';
comment on column public.clients.snoring_nasal is 'いびき・鼻づまり（任意）';
comment on column public.clients.medical_history is '既往歴（任意）';
