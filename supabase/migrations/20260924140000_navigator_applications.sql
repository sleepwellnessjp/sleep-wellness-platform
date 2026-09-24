-- ============================================================
-- navigator_applications — 睡眠ウェルネスナビゲーター申請
-- 公開フォームからの作成は誰でも可。閲覧・更新は is_admin_or_above() のみ。
-- メール送信はこのテーブルでは行わない。
-- ============================================================

create table if not exists public.navigator_applications (
  id uuid primary key default gen_random_uuid(),
  name_kanji text not null,
  name_kana text not null,
  email text not null,
  phone text not null,
  cohort text not null,
  completion_date date not null,
  region text not null,
  teaching_status text not null,
  motivation text not null,
  activity_plan text not null,
  payer_name_kana text not null default '',
  fee_agreed boolean not null default false,
  note text not null default '',
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  payment_confirmed_at timestamptz,
  approved_at timestamptz,
  review_memo text not null default '',
  submitter_ip text not null,
  updated_at timestamptz not null default now(),
  constraint navigator_applications_name_kanji_not_blank
    check (btrim(name_kanji) <> ''),
  constraint navigator_applications_name_kana_not_blank
    check (btrim(name_kana) <> ''),
  constraint navigator_applications_email_not_blank
    check (btrim(email) <> ''),
  constraint navigator_applications_phone_not_blank
    check (btrim(phone) <> ''),
  constraint navigator_applications_region_not_blank
    check (btrim(region) <> ''),
  constraint navigator_applications_teaching_status_not_blank
    check (btrim(teaching_status) <> ''),
  constraint navigator_applications_motivation_not_blank
    check (btrim(motivation) <> ''),
  constraint navigator_applications_activity_plan_not_blank
    check (btrim(activity_plan) <> ''),
  constraint navigator_applications_fee_agreed_true
    check (fee_agreed = true),
  constraint navigator_applications_cohort_check
    check (cohort in ('cohort_1', 'cohort_2', 'other')),
  constraint navigator_applications_status_check
    check (status in ('submitted', 'awaiting_payment', 'approved', 'rejected')),
  constraint navigator_applications_payer_kana_check
    check (
      payer_name_kana = ''
      or payer_name_kana ~ '^[ァ-ヶー・･ 　]+$'
    )
);

comment on table public.navigator_applications is
  '睡眠ウェルネスナビゲーター申請。状態は申請中/入金待ち/承認済み/却下';
comment on column public.navigator_applications.cohort is
  'cohort_1=第1期, cohort_2=第2期, other=その他';
comment on column public.navigator_applications.status is
  'submitted=申請中, awaiting_payment=入金待ち, approved=承認済み, rejected=却下';
comment on column public.navigator_applications.payer_name_kana is
  '振込名義（カナ）。申請者名と異なる場合のみ';
comment on column public.navigator_applications.submitter_ip is
  '連続送信制限用。管理画面には出さない';

create unique index if not exists navigator_applications_email_unique
  on public.navigator_applications (lower(email));

create index if not exists navigator_applications_status_submitted_idx
  on public.navigator_applications (status, submitted_at desc);

create index if not exists navigator_applications_ip_submitted_idx
  on public.navigator_applications (submitter_ip, submitted_at desc);

create or replace function public.navigator_applications_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  last_at timestamptz;
begin
  if new.submitter_ip is null or btrim(new.submitter_ip) = '' then
    raise exception 'navigator_rate_limited';
  end if;

  perform pg_advisory_xact_lock(hashtext('navigator:' || btrim(new.submitter_ip))::bigint);

  if new.fee_agreed is not true then
    raise exception 'navigator_fee_required';
  end if;

  new.submitter_ip := left(btrim(new.submitter_ip), 64);
  new.email := lower(btrim(new.email));
  new.status := 'submitted';
  new.review_memo := '';
  new.payment_confirmed_at := null;
  new.approved_at := null;
  new.submitted_at := now();
  new.updated_at := now();

  select max(submitted_at) into last_at
  from public.navigator_applications
  where submitter_ip = new.submitter_ip;

  if last_at is not null and last_at > now() - interval '60 seconds' then
    raise exception 'navigator_rate_limited';
  end if;

  select count(*) into recent_count
  from public.navigator_applications
  where submitter_ip = new.submitter_ip
    and submitted_at > now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'navigator_rate_limited';
  end if;

  return new;
end;
$$;

drop trigger if exists navigator_applications_before_insert
  on public.navigator_applications;
create trigger navigator_applications_before_insert
  before insert on public.navigator_applications
  for each row
  execute function public.navigator_applications_before_insert();

create or replace function public.navigator_applications_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'awaiting_payment' and old.payment_confirmed_at is null then
    new.payment_confirmed_at := now();
  end if;
  if new.status = 'approved' and old.approved_at is null then
    new.approved_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists navigator_applications_before_update
  on public.navigator_applications;
create trigger navigator_applications_before_update
  before update on public.navigator_applications
  for each row
  execute function public.navigator_applications_before_update();

alter table public.navigator_applications enable row level security;

drop policy if exists "navigator_applications_insert_public"
  on public.navigator_applications;
create policy "navigator_applications_insert_public"
  on public.navigator_applications for insert
  to anon, authenticated
  with check (true);

drop policy if exists "navigator_applications_select_admin"
  on public.navigator_applications;
create policy "navigator_applications_select_admin"
  on public.navigator_applications for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "navigator_applications_update_admin"
  on public.navigator_applications;
create policy "navigator_applications_update_admin"
  on public.navigator_applications for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

grant insert on public.navigator_applications to anon, authenticated;
grant select, update on public.navigator_applications to authenticated;

revoke all on function public.navigator_applications_before_insert() from public;
grant execute on function public.navigator_applications_before_insert() to anon, authenticated;

revoke all on function public.navigator_applications_before_update() from public;
grant execute on function public.navigator_applications_before_update() to authenticated;
