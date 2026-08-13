-- Admin status changes go through one atomic, database-enforced operation.
-- Authenticated users may call it, but only an active admin can change another
-- admin. An admin cannot deactivate themself or the final active admin.

drop policy if exists "Admins can update user_roles" on public.user_roles;
revoke update on table public.user_roles from anon, authenticated;

create or replace function public.set_admin_active(
  _role_id uuid,
  _aktiv boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_user_id uuid;
  target_is_active boolean;
  active_admin_count bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(731904222);

  if caller_id is null or not public.has_role(caller_id, 'admin'::public.app_role) then
    raise exception 'Only an active administrator can change administrator status'
      using errcode = '42501';
  end if;

  select user_id, aktiv
  into target_user_id, target_is_active
  from public.user_roles
  where id = _role_id
    and role = 'admin'::public.app_role
  for update;

  if target_user_id is null then
    raise exception 'Administrator not found' using errcode = 'P0002';
  end if;

  if not _aktiv and target_user_id = caller_id then
    raise exception 'You cannot deactivate your own administrator account'
      using errcode = '22023';
  end if;

  if not _aktiv and target_is_active then
    select count(*)
    into active_admin_count
    from public.user_roles
    where role = 'admin'::public.app_role
      and aktiv = true;

    if active_admin_count <= 1 then
      raise exception 'The final active administrator cannot be deactivated'
        using errcode = '23514';
    end if;
  end if;

  update public.user_roles
  set aktiv = _aktiv
  where id = _role_id
    and role = 'admin'::public.app_role;
end;
$$;

revoke execute
on function public.set_admin_active(uuid, boolean)
from public, anon;

grant execute
on function public.set_admin_active(uuid, boolean)
to authenticated;
