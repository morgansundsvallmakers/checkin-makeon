-- Finalize an Auth invitation by granting the administrator role only while the
-- inviting administrator is still active. This shares the transaction lock
-- used by set_admin_active so authorization and status changes are serialized.

create or replace function public.grant_invited_admin(
  _caller_id uuid,
  _target_user_id uuid
)
returns table (
  id uuid,
  user_id uuid,
  role public.app_role,
  aktiv boolean
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  caller_role public.user_roles%rowtype;
  target_role public.user_roles%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(731904222);

  select roles.*
  into caller_role
  from public.user_roles as roles
  where roles.user_id = _caller_id
    and roles.role = 'admin'::public.app_role
  for update;

  if not found then
    raise exception 'Only an active administrator can grant administrator access'
      using errcode = '42501';
  end if;

  if caller_role.aktiv is not true then
    raise exception 'Only an active administrator can grant administrator access'
      using errcode = '42501';
  end if;

  select roles.*
  into target_role
  from public.user_roles as roles
  where roles.user_id = _target_user_id
    and roles.role = 'admin'::public.app_role
  for update;

  if found then
    if target_role.aktiv is not true then
      raise exception 'An inactive administrator must be reactivated explicitly'
        using errcode = '55000';
    end if;
  else
    insert into public.user_roles (user_id, role, aktiv)
    values (_target_user_id, 'admin'::public.app_role, true)
    returning public.user_roles.* into target_role;
  end if;

  return query
  select target_role.id, target_role.user_id, target_role.role, target_role.aktiv;
end;
$$;

revoke execute
on function public.grant_invited_admin(uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.grant_invited_admin(uuid, uuid)
to service_role;
