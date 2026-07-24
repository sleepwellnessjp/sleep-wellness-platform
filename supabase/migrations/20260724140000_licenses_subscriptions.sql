-- Migration: 20260724140000_licenses_subscriptions
-- SWIJ 認定講師ライセンス / サブスクリプション管理

-- ============================================================
-- licenses
-- ============================================================
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_email text,
  user_display_name text,
  license_number text not null,
  certification_level text not null,
  certified_at date not null,
  expires_at date not null,
  status text not null default 'active',
  status_history jsonb not null default '[]'::jsonb,
  admin_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint licenses_level_check
    check (
      certification_level in (
        'foundation',
        'practitioner',
        'instructor',
        'navigator',
        'producer'
      )
    ),
  constraint licenses_status_check
    check (
      status in (
        'active',
        'renewal_pending',
        'expired',
        'suspended'
      )
    ),
  constraint licenses_number_unique unique (license_number)
);

create index if not exists licenses_user_id_idx
  on public.licenses (user_id, updated_at desc);

create index if not exists licenses_status_idx
  on public.licenses (status, updated_at desc);

create index if not exists licenses_level_idx
  on public.licenses (certification_level, updated_at desc);

create index if not exists licenses_number_idx
  on public.licenses (license_number);

comment on table public.licenses is
  'SWIJ 認定講師ライセンス（本人閲覧 / 管理者編集）';

drop trigger if exists licenses_set_updated_at on public.licenses;
create trigger licenses_set_updated_at
before update on public.licenses
for each row execute function public.set_updated_at();

-- ============================================================
-- subscriptions
-- ============================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  license_id uuid references public.licenses (id) on delete set null,
  plan text not null,
  billing_cycle text not null default 'yearly',
  monthly_amount integer not null default 0,
  yearly_amount integer not null default 0,
  status text not null default 'active',
  current_period_start date not null,
  current_period_end date not null,
  next_renewal_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_check
    check (
      plan in (
        'foundation',
        'practitioner',
        'instructor',
        'navigator',
        'producer'
      )
    ),
  constraint subscriptions_billing_cycle_check
    check (billing_cycle in ('monthly', 'yearly')),
  constraint subscriptions_status_check
    check (
      status in ('active', 'past_due', 'canceled', 'paused')
    )
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id, updated_at desc);

create index if not exists subscriptions_license_id_idx
  on public.subscriptions (license_id);

comment on table public.subscriptions is
  '認定プランのサブスクリプション（月額/年額・次回更新）';

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- ============================================================
-- certificates
-- ============================================================
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  license_id uuid not null references public.licenses (id) on delete cascade,
  certificate_number text not null,
  holder_name text not null default '',
  issued_at date not null,
  verification_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certificates_number_unique unique (certificate_number),
  constraint certificates_verification_unique unique (verification_code)
);

create index if not exists certificates_user_id_idx
  on public.certificates (user_id);

create index if not exists certificates_license_id_idx
  on public.certificates (license_id);

comment on table public.certificates is
  'デジタル認定証（表示・検証コード / QR）';

drop trigger if exists certificates_set_updated_at on public.certificates;
create trigger certificates_set_updated_at
before update on public.certificates
for each row execute function public.set_updated_at();

-- ============================================================
-- continuing_education
-- ============================================================
create table if not exists public.continuing_education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  license_id uuid not null references public.licenses (id) on delete cascade,
  hours_completed numeric(6,1) not null default 0,
  credits_earned numeric(6,1) not null default 0,
  required_hours numeric(6,1) not null default 10,
  renewal_requirement text not null default '',
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint continuing_education_license_unique unique (license_id)
);

create index if not exists continuing_education_user_id_idx
  on public.continuing_education (user_id);

comment on table public.continuing_education is
  '継続教育（受講時間・単位・更新条件）';

drop trigger if exists continuing_education_set_updated_at
  on public.continuing_education;
create trigger continuing_education_set_updated_at
before update on public.continuing_education
for each row execute function public.set_updated_at();

-- ============================================================
-- payment_history
-- ============================================================
create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount integer not null default 0,
  currency text not null default 'JPY',
  paid_at timestamptz not null default now(),
  method text not null default '',
  description text not null default '',
  status text not null default 'paid',
  created_at timestamptz not null default now(),
  constraint payment_history_status_check
    check (status in ('paid', 'refunded', 'failed'))
);

create index if not exists payment_history_user_paid_idx
  on public.payment_history (user_id, paid_at desc);

create index if not exists payment_history_subscription_idx
  on public.payment_history (subscription_id);

comment on table public.payment_history is
  'サブスクリプション支払履歴';

-- ============================================================
-- RLS
-- ============================================================
alter table public.licenses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.certificates enable row level security;
alter table public.continuing_education enable row level security;
alter table public.payment_history enable row level security;

-- licenses: 本人閲覧 / 管理者のみ書込
drop policy if exists "licenses_select_own_or_admin" on public.licenses;
create policy "licenses_select_own_or_admin"
  on public.licenses for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "licenses_insert_admin" on public.licenses;
create policy "licenses_insert_admin"
  on public.licenses for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "licenses_update_admin" on public.licenses;
create policy "licenses_update_admin"
  on public.licenses for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "licenses_delete_admin" on public.licenses;
create policy "licenses_delete_admin"
  on public.licenses for delete
  to authenticated
  using (public.is_admin_or_above());

-- subscriptions
drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin"
  on public.subscriptions for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "subscriptions_insert_admin" on public.subscriptions;
create policy "subscriptions_insert_admin"
  on public.subscriptions for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "subscriptions_update_admin" on public.subscriptions;
create policy "subscriptions_update_admin"
  on public.subscriptions for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "subscriptions_delete_admin" on public.subscriptions;
create policy "subscriptions_delete_admin"
  on public.subscriptions for delete
  to authenticated
  using (public.is_admin_or_above());

-- certificates
drop policy if exists "certificates_select_own_or_admin" on public.certificates;
create policy "certificates_select_own_or_admin"
  on public.certificates for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "certificates_insert_admin" on public.certificates;
create policy "certificates_insert_admin"
  on public.certificates for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "certificates_update_admin" on public.certificates;
create policy "certificates_update_admin"
  on public.certificates for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "certificates_delete_admin" on public.certificates;
create policy "certificates_delete_admin"
  on public.certificates for delete
  to authenticated
  using (public.is_admin_or_above());

-- continuing_education
drop policy if exists "continuing_education_select_own_or_admin"
  on public.continuing_education;
create policy "continuing_education_select_own_or_admin"
  on public.continuing_education for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "continuing_education_insert_admin"
  on public.continuing_education;
create policy "continuing_education_insert_admin"
  on public.continuing_education for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "continuing_education_update_admin"
  on public.continuing_education;
create policy "continuing_education_update_admin"
  on public.continuing_education for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "continuing_education_delete_admin"
  on public.continuing_education;
create policy "continuing_education_delete_admin"
  on public.continuing_education for delete
  to authenticated
  using (public.is_admin_or_above());

-- payment_history
drop policy if exists "payment_history_select_own_or_admin"
  on public.payment_history;
create policy "payment_history_select_own_or_admin"
  on public.payment_history for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "payment_history_insert_admin"
  on public.payment_history;
create policy "payment_history_insert_admin"
  on public.payment_history for insert
  to authenticated
  with check (public.is_admin_or_above());

drop policy if exists "payment_history_update_admin"
  on public.payment_history;
create policy "payment_history_update_admin"
  on public.payment_history for update
  to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "payment_history_delete_admin"
  on public.payment_history;
create policy "payment_history_delete_admin"
  on public.payment_history for delete
  to authenticated
  using (public.is_admin_or_above());
