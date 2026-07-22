-- Sleep Wellness OS v3.0: enterprise role support
-- Adds enterprise (企業管理者) to profiles.role

update public.profiles
set role = 'instructor'
where role is null
   or role not in (
     'super_admin',
     'admin',
     'instructor',
     'client',
     'enterprise'
   );

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'super_admin',
      'admin',
      'instructor',
      'client',
      'enterprise'
    )
  );
