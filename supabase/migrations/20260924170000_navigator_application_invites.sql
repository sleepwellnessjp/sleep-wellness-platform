-- navigator_applications に招待結果を残す
-- 本番へは自動適用しない。Supabase SQL Editor で実行する。

alter table public.navigator_applications
  add column if not exists invite_status text,
  add column if not exists invite_error text not null default '',
  add column if not exists invited_at timestamptz,
  add column if not exists auth_user_id uuid;

alter table public.navigator_applications
  drop constraint if exists navigator_applications_invite_status_check;

alter table public.navigator_applications
  add constraint navigator_applications_invite_status_check
  check (
    invite_status is null
    or invite_status in ('sending', 'sent', 'existing_account', 'failed')
  );

comment on column public.navigator_applications.invite_status is
  'sending=送信中, sent=招待メール送信済み, existing_account=既存アカウント, failed=送信失敗。未実施は null';
comment on column public.navigator_applications.invite_error is
  '招待に失敗した理由。成功時と既存アカウント時は空';
comment on column public.navigator_applications.invited_at is
  '招待メールを送った日時。既存アカウントでは null';
comment on column public.navigator_applications.auth_user_id is
  '既存アカウント、または招待で作成された auth ユーザーの id。role の更新には使わない';
