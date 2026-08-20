drop policy if exists "Public can view members" on public.members;
drop policy if exists "Public can view attendance" on public.attendance;

create policy "Admins can view members"
on public.members
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can view attendance"
on public.attendance
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));
