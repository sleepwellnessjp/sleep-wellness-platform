-- ============================================================
-- ヨガフェスタ SOXAI 参加登録: age (integer) → age_band (text)
-- 適用前に yoga_fest_soxai_registrations を空にすること。
-- 選択肢は lib/yoga-fest-2026-soxai/types.ts の YOGA_FEST_SOXAI_AGE_BANDS と一致。
-- ============================================================

alter table public.yoga_fest_soxai_registrations
  drop constraint if exists yoga_fest_soxai_registrations_age_range;

alter table public.yoga_fest_soxai_registrations
  drop constraint if exists yoga_fest_soxai_registrations_minor_guardian_check;

alter table public.yoga_fest_soxai_registrations
  drop column age;

alter table public.yoga_fest_soxai_registrations
  add column age_band text not null;

alter table public.yoga_fest_soxai_registrations
  add constraint yoga_fest_soxai_registrations_age_band_check
  check (
    age_band in (
      '18歳未満',
      '18〜19歳',
      '20代',
      '30代',
      '40代',
      '50代',
      '60代',
      '70代以上'
    )
  );

alter table public.yoga_fest_soxai_registrations
  add constraint yoga_fest_soxai_registrations_minor_guardian_check
  check (
    (
      age_band <> '18歳未満'
      and btrim(guardian_name) = ''
      and guardian_consent = false
    )
    or (
      age_band = '18歳未満'
      and btrim(guardian_name) <> ''
      and guardian_consent = true
    )
  );

comment on column public.yoga_fest_soxai_registrations.age_band is
  '参加登録フォームの年代選択（正確な年齢は保存しない）';

-- 旧シグネチャ（p_age integer）を削除
drop function if exists public.create_yoga_fest_soxai_registration(
  text, text, integer, text, text, boolean, boolean, text
);

create or replace function public.create_yoga_fest_soxai_registration(
  p_class_id text,
  p_name text,
  p_age_band text,
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
  v_age_band text;
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

  v_age_band := btrim(coalesce(p_age_band, ''));

  if v_age_band = ''
    or v_age_band not in (
      '18歳未満',
      '18〜19歳',
      '20代',
      '30代',
      '40代',
      '50代',
      '60代',
      '70代以上'
    )
  then
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

  if v_age_band = '18歳未満' then
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
    age_band,
    email,
    guardian_name,
    guardian_consent,
    info_consent,
    submitter_ip
  )
  values (
    p_class_id,
    btrim(p_name),
    v_age_band,
    v_email,
    case when v_age_band = '18歳未満' then v_guardian_name else '' end,
    case when v_age_band = '18歳未満' then true else false end,
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
  text, text, text, text, text, boolean, boolean, text
) is
  'SOXAI 検証参加登録。同一 class_id + email は1件のみ。IP は10分あたり100件まで';

revoke all on function public.create_yoga_fest_soxai_registration(
  text, text, text, text, text, boolean, boolean, text
) from public;
revoke all on function public.create_yoga_fest_soxai_registration(
  text, text, text, text, text, boolean, boolean, text
) from anon, authenticated;
grant execute on function public.create_yoga_fest_soxai_registration(
  text, text, text, text, text, boolean, boolean, text
) to service_role;
