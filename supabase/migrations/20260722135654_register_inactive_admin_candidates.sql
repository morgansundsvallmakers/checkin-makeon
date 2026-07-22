-- Every registered account receives an admin-role row.
-- The first account becomes active; later accounts remain inactive
-- until an existing administrator activates them.

create or replace function public.grant_admin_to_first_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  make_active boolean;
begin
  -- Prevent simultaneous registrations from both becoming first admin.
  perform pg_catalog.pg_advisory_xact_lock(731904221);

  select not exists (
    select 1
    from public.user_roles
    where role = 'admin'::public.app_role
  )
  into make_active;

  insert into public.user_roles (user_id, role, aktiv)
  values (
    new.id,
    'admin'::public.app_role,
    make_active
  )
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke execute
on function public.grant_admin_to_first_user()
from public, anon, authenticated;

-- Make already registered accounts without a role visible as inactive.
insert into public.user_roles (user_id, role, aktiv)
select
  users.id,
  'admin'::public.app_role,
  false
from auth.users as users
where not exists (
  select 1
  from public.user_roles as roles
  where roles.user_id = users.id
    and roles.role = 'admin'::public.app_role
);