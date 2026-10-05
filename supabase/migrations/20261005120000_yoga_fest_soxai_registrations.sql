-- ============================================================
-- ヨガフェスタ横浜2026 SOXAI 検証 — 参加登録
-- クラスは lib/yoga-fest-2026-soxai/classes.ts の定数と class_id を一致させる。
-- 公開フォームの登録はサーバー API → create_yoga_fest_soxai_registration()（service_role のみ）。
-- ============================================================

create table if not exists public.yoga_fest_soxai_registrations (
  id uuid primary key default gen_random_uuid(),
  class_id text not null,
  name text not null,
  age integer not null,
  email text not null,
  guardian_name text not null default '',
  guardian_consent boolean not null default false,
  info_consent boolean not null default false,
  submitter_ip text not null,
  submitted_at timestamptz not null default now(),
  constraint yoga_fest_soxai_registrations_name_not_blank
    check (btrim(name) <> ''),
  constraint yoga_fest_soxai_registrations_email_not_blank
    check (btrim(email) <> ''),
  constraint yoga_fest_soxai_registrations_age_range
    check (age >= 0 and age <= 120),
  constraint yoga_fest_soxai_registrations_info_consent_true
    check (info_consent = true),
  constraint yoga_fest_soxai_registrations_class_id_check
    check (
      class_id in (
        'yf26-1010-0930-e',
        'yf26-1010-1330-b',
        'yf26-1010-1730-e',
        'yf26-1011-1130-c',
        'yf26-1011-1700-a',
        'yf26-1012-0930-b',
        'yf26-1012-1500-d',
        'yf26-1012-1530-e'
      )
    ),
  constraint yoga_fest_soxai_registrations_minor_guardian_check
    check (
      (age >= 18 and btrim(guardian_name) = '' and guardian_consent = false)
      or (
        age < 18
        and btrim(guardian_name) <> ''
        and guardian_consent = true
      )
    )
);

comment on table public.yoga_fest_soxai_registrations is
  'ヨガフェスタ横浜2026 SOXAI 検証の参加登録';
comment on column public.yoga_fest_soxai_registrations.class_id is
  '固定8クラス ID（アプリ定数と一致）';
comment on column public.yoga_fest_soxai_registrations.submitter_ip is
  '会場 Wi-Fi 等の IP レート制限用。管理画面には出さない';

create unique index if not exists yoga_fest_soxai_registrations_class_email_unique
  on public.yoga_fest_soxai_registrations (class_id, lower(btrim(email)));

create index if not exists yoga_fest_soxai_registrations_class_submitted_idx
  on public.yoga_fest_soxai_registrations (class_id, submitted_at desc);

create index if not exists yoga_fest_soxai_registrations_ip_submitted_idx
  on public.yoga_fest_soxai_registrations (submitter_ip, submitted_at desc);

-- ------------------------------------------------------------
-- 登録作成（service_role のみ実行可）
-- ------------------------------------------------------------

create or replace function public.create_yoga_fest_soxai_registration(
  p_class_id text,
  p_name text,
  p_age integer,
  p_email text,
  p_guardian_name text,
  p_guardian_consent boolean,
  p_info_consent boolean,
  p_submitter_ip text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_id uuid;
  v_ip text;
  v_email text;
  v_recent_count integer;
  v_guardian_name text;
begin
  if p_submitter_ip is null or btrim(p_submitter_ip) = '' then
    raise exception 'yf_soxai_rate_limited';
  end if;

  v_ip := left(btrim(p_submitter_ip), 64);
  perform pg_advisory_xact_lock(hashtext('yoga_fest_soxai:' || v_ip)::bigint);

  select count(*) into v_recent_count
  from public.yoga_fest_soxai_registrations
  where submitter_ip = v_ip
    and submitted_at > now() - interval '10 minutes';

  if v_recent_count >= 100 then
    raise exception 'yf_soxai_rate_limited';
  end if;

  if p_class_id is null
    or p_class_id not in (
      'yf26-1010-0930-e',
      'yf26-1010-1330-b',
      'yf26-1010-1730-e',
      'yf26-1011-1130-c',
      'yf26-1011-1700-a',
      'yf26-1012-0930-b',
      'yf26-1012-1500-d',
      'yf26-1012-1530-e'
    )
  then
    raise exception 'yf_soxai_class_invalid';
  end if;

  if p_age is null or p_age < 0 or p_age > 120 then
    raise exception 'yf_soxai_invalid';
  end if;

  if btrim(coalesce(p_name, '')) = ''
    or btrim(coalesce(p_email, '')) = ''
  then
    raise exception 'yf_soxai_invalid';
  end if;

  if p_info_consent is distinct from true then
    raise exception 'yf_soxai_invalid';
  end if;

  v_guardian_name := coalesce(btrim(p_guardian_name), '');

  if p_age < 18 then
    if v_guardian_name = '' or p_guardian_consent is distinct from true then
      raise exception 'yf_soxai_invalid';
    end if;
  else
    if v_guardian_name <> '' or p_guardian_consent = true then
      raise exception 'yf_soxai_invalid';
    end if;
  end if;

  v_email := lower(btrim(p_email));

  if exists (
    select 1
    from public.yoga_fest_soxai_registrations r
    where r.class_id = p_class_id
      and lower(btrim(r.email)) = v_email
  ) then
    raise exception 'yf_soxai_duplicate';
  end if;

  insert into public.yoga_fest_soxai_registrations (
    class_id,
    name,
    age,
    email,
    guardian_name,
    guardian_consent,
    info_consent,
    submitter_ip
  )
  values (
    p_class_id,
    btrim(p_name),
    p_age,
    v_email,
    case when p_age < 18 then v_guardian_name else '' end,
    case when p_age < 18 then true else false end,
    true,
    v_ip
  )
  returning id into v_registration_id;

  return v_registration_id;
exception
  when unique_violation then
    raise exception 'yf_soxai_duplicate';
end;
$$;

comment on function public.create_yoga_fest_soxai_registration(
  text, text, integer, text, text, boolean, boolean, text
) is
  'SOXAI 検証参加登録。同一 class_id + email は1件のみ。IP は10分あたり100件まで';

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.yoga_fest_soxai_registrations enable row level security;

drop policy if exists "yoga_fest_soxai_registrations_select_admin"
  on public.yoga_fest_soxai_registrations;
create policy "yoga_fest_soxai_registrations_select_admin"
  on public.yoga_fest_soxai_registrations for select
  to authenticated
  using (public.is_admin_or_above());

drop policy if exists "yoga_fest_soxai_registrations_delete_admin"
  on public.yoga_fest_soxai_registrations;
create policy "yoga_fest_soxai_registrations_delete_admin"
  on public.yoga_fest_soxai_registrations for delete
  to authenticated
  using (public.is_admin_or_above());

-- INSERT は RPC のみ（第2段階の管理画面・CSV 用に SELECT/DELETE を管理者へ）

-- ------------------------------------------------------------
-- GRANT
-- ------------------------------------------------------------

grant select, delete on public.yoga_fest_soxai_registrations to authenticated;

revoke all on function public.create_yoga_fest_soxai_registration(
  text, text, integer, text, text, boolean, boolean, text
) from public;
revoke all on function public.create_yoga_fest_soxai_registration(
  text, text, integer, text, text, boolean, boolean, text
) from anon, authenticated;
grant execute on function public.create_yoga_fest_soxai_registration(
  text, text, integer, text, text, boolean, boolean, text
) to service_role;

revoke all on table public.yoga_fest_soxai_registrations from anon;
revoke insert, update on table public.yoga_fest_soxai_registrations from authenticated;
