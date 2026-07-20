-- Sleep Wellness Platform V1.0 — analysis persistence + idempotent credits
-- Migration: 20260720120000_analysis_persist_v1
-- Prerequisites: 20260720100000_platform_v1 (platform-v1.sql 実行済み)

-- ============================================================
-- analyses: store OCR / confirmed / report payload explicitly
-- ============================================================
alter table public.analyses
  add column if not exists confirmed_metrics jsonb,
  add column if not exists report_payload jsonb,
  add column if not exists credits_consumed integer not null default 0
    check (credits_consumed >= 0),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists analyses_set_updated_at on public.analyses;
create trigger analyses_set_updated_at
before update on public.analyses
for each row execute function public.set_updated_at();

-- ============================================================
-- analysis_history: updated_at + unique analysis_id (idempotent)
-- ============================================================
alter table public.analysis_history
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists analysis_history_set_updated_at on public.analysis_history;
create trigger analysis_history_set_updated_at
before update on public.analysis_history
for each row execute function public.set_updated_at();

-- 既存の重複 analysis_id があると UNIQUE INDEX が失敗して途中停止する
-- 同一 user_id + analysis_id は最新1件を残し、それ以外を削除
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, analysis_id
      order by created_at desc nulls last, id desc
    ) as rn
  from public.analysis_history
  where analysis_id is not null
)
delete from public.analysis_history ah
using ranked r
where ah.id = r.id
  and r.rn > 1;

create unique index if not exists analysis_history_analysis_id_unique
  on public.analysis_history (user_id, analysis_id)
  where analysis_id is not null;

-- ============================================================
-- consume_analysis_credit: 同一 analysis_id 二重消費防止
-- platform-v1 の row_security=off を維持（再定義で落とさない）
-- ============================================================
create or replace function public.consume_analysis_credit(
  p_client_name text,
  p_measurement_date date default null,
  p_sleep_score numeric default null,
  p_client_id uuid default null,
  p_analysis_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_membership_status text;
  v_row public.monthly_credit;
  v_history_id uuid;
  v_balance integer;
  v_existing_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'ログインが必要です。');
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if v_role is null then
    return jsonb_build_object('ok', false, 'message', 'プロフィールが見つかりません。');
  end if;

  if v_role in ('super_admin', 'admin') then
    return jsonb_build_object('ok', true, 'message', '管理者は消費対象外', 'remaining', 999);
  end if;

  -- 同一 analysis_id への二重消費を防止（並行リクエストも直列化）
  if p_analysis_id is not null then
    perform pg_advisory_xact_lock(
      hashtext('swij_consume_credit'),
      hashtext(v_user_id::text || ':' || p_analysis_id::text)
    );

    select id into v_existing_id
    from public.analysis_history
    where user_id = v_user_id
      and analysis_id = p_analysis_id
    limit 1;

    if v_existing_id is not null then
      v_row := public.ensure_monthly_credit(v_user_id);
      return jsonb_build_object(
        'ok', true,
        'message', 'already_consumed',
        'remaining', greatest(0, v_row.granted_amount - v_row.used_amount),
        'history_id', v_existing_id
      );
    end if;
  end if;

  select status into v_membership_status
  from public.membership
  where user_id = v_user_id
  order by updated_at desc
  limit 1;

  if v_membership_status is distinct from 'active' then
    return jsonb_build_object(
      'ok', false,
      'message',
      '認定資格の更新が必要です。Sleep Wellness Institute Japan までお問い合わせください。'
    );
  end if;

  v_row := public.ensure_monthly_credit(v_user_id);

  select * into v_row
  from public.monthly_credit
  where id = v_row.id
  for update;

  if (v_row.granted_amount - v_row.used_amount) < 1 then
    return jsonb_build_object('ok', false, 'message', 'クレジットが不足しています。管理者にお問い合わせください。');
  end if;

  update public.monthly_credit
  set used_amount = used_amount + 1
  where id = v_row.id
  returning (granted_amount - used_amount) into v_balance;

  insert into public.analysis_history (
    user_id,
    client_id,
    analysis_id,
    client_name,
    measurement_date,
    sleep_score,
    credits_consumed,
    status
  ) values (
    v_user_id,
    p_client_id,
    p_analysis_id,
    coalesce(p_client_name, ''),
    p_measurement_date,
    p_sleep_score,
    1,
    'completed'
  )
  returning id into v_history_id;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    reference_id,
    description,
    created_by
  ) values (
    v_user_id,
    'analysis_use',
    -1,
    v_balance,
    v_history_id,
    '睡眠分析: ' || coalesce(p_client_name, ''),
    v_user_id
  );

  if p_analysis_id is not null then
    update public.analyses
    set credits_consumed = 1,
        updated_at = now()
    where id = p_analysis_id
      and owner_id = v_user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'クレジットを消費しました',
    'remaining', v_balance,
    'history_id', v_history_id
  );
end;
$$;

grant execute on function public.consume_analysis_credit(text, date, numeric, uuid, uuid) to authenticated;
