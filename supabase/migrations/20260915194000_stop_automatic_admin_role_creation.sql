-- Auth accounts are identities only. Administrator access is granted explicitly
-- through public.user_roles by the administrator-management flow.
--
-- Keep all existing role rows intact; this migration only removes the legacy
-- automatic Auth-user -> admin-role behavior.

drop trigger if exists on_auth_user_created_grant_first_admin on auth.users;

drop function if exists public.grant_admin_to_first_user();
