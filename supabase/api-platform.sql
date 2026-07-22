-- Sleep Wellness API Platform (Version 4.0)
-- API keys, webhooks, rate limits, audit logs

create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  app_name text not null default '',
  scopes text[] not null default array['*']::text[],
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  rate_limit_per_minute integer not null default 60,
  usage_count bigint not null default 0,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists api_keys_status_idx on public.api_keys (status);
create index if not exists api_keys_prefix_idx on public.api_keys (key_prefix);

create table if not exists public.api_webhooks (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  secret text not null,
  events text[] not null default '{}',
  active boolean not null default true,
  description text not null default '',
  failure_count integer not null default 0,
  last_delivery_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.api_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.api_webhooks (id) on delete cascade,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'delivered', 'failed')),
  attempts integer not null default 0,
  response_status integer,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists api_webhook_deliveries_webhook_idx
  on public.api_webhook_deliveries (webhook_id, created_at desc);

create table if not exists public.api_audit_logs (
  id uuid primary key default gen_random_uuid(),
  method text not null,
  path text not null,
  status_code integer not null,
  auth_method text not null default 'none',
  api_key_id uuid references public.api_keys (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  role text,
  app_name text,
  ip text,
  user_agent text,
  duration_ms integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists api_audit_logs_created_idx
  on public.api_audit_logs (created_at desc);
create index if not exists api_audit_logs_api_key_idx
  on public.api_audit_logs (api_key_id, created_at desc);

create table if not exists public.api_rate_limit_settings (
  id text primary key default 'default',
  default_per_minute integer not null default 60,
  burst_per_minute integer not null default 120,
  authenticated_per_minute integer not null default 300,
  updated_at timestamptz not null default now()
);

insert into public.api_rate_limit_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.api_keys enable row level security;
alter table public.api_webhooks enable row level security;
alter table public.api_webhook_deliveries enable row level security;
alter table public.api_audit_logs enable row level security;
alter table public.api_rate_limit_settings enable row level security;

-- Admin-only policies (profiles.role in admin / super_admin)
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

drop policy if exists api_keys_admin_all on public.api_keys;
create policy api_keys_admin_all on public.api_keys
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists api_webhooks_admin_all on public.api_webhooks;
create policy api_webhooks_admin_all on public.api_webhooks
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists api_webhook_deliveries_admin_all on public.api_webhook_deliveries;
create policy api_webhook_deliveries_admin_all on public.api_webhook_deliveries
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists api_audit_logs_admin_select on public.api_audit_logs;
create policy api_audit_logs_admin_select on public.api_audit_logs
  for select using (public.is_platform_admin());

drop policy if exists api_rate_limit_admin_all on public.api_rate_limit_settings;
create policy api_rate_limit_admin_all on public.api_rate_limit_settings
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());
