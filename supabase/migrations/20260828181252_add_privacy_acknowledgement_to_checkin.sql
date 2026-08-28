alter table public.members
  add column privacy_acknowledged_at timestamp with time zone,
  add column privacy_notice_version text;

comment on column public.members.privacy_acknowledged_at is
  'When the member acknowledged the CheckIn MakeOn privacy notice.';

comment on column public.members.privacy_notice_version is
  'Privacy notice version acknowledged by the member. Initial version: 2026-08-28-v1.';

drop function public.check_in_member(text);

create function public.check_in_member(
  p_medlemsnummer text,
  p_namn text default null
)
returns table (
  status text,
  display_name text,
  visit_count bigint,
  event_title text,
  today_number bigint,
  message text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
  v_event public.events%rowtype;
  v_inserted boolean := false;
  v_privacy_notice_version constant text := '2026-08-28-v1';
begin
  select *
  into v_member
  from public.members
  where medlemsnummer = pg_catalog.btrim(p_medlemsnummer)
  limit 1
  for update;

  if not found or not v_member.aktiv then
    return query select
      'error'::text,
      null::text,
      null::bigint,
      null::text,
      null::bigint,
      'Medlemsnumret finns inte aktivt i CheckIn MakeOn.'::text;
    return;
  end if;

  select *
  into v_event
  from public.events
  where aktiv = true
  order by datum desc
  limit 1;

  if not found then
    return query select
      'error'::text,
      null::text,
      null::bigint,
      null::text,
      null::bigint,
      'Ingen aktiv medlemskväll just nu.'::text;
    return;
  end if;

  if v_member.privacy_acknowledged_at is null
     or v_member.privacy_notice_version is distinct from v_privacy_notice_version then
    if p_namn is null or pg_catalog.btrim(p_namn) = '' then
      return query select
        'privacy_required'::text,
        null::text,
        null::bigint,
        null::text,
        null::bigint,
        null::text;
      return;
    end if;

    if pg_catalog.lower(
         pg_catalog.regexp_replace(pg_catalog.btrim(p_namn), '[[:space:]]+', ' ', 'g')
       ) is distinct from pg_catalog.lower(
         pg_catalog.regexp_replace(pg_catalog.btrim(v_member.namn), '[[:space:]]+', ' ', 'g')
       ) then
      return query select
        'privacy_name_mismatch'::text,
        null::text,
        null::bigint,
        null::text,
        null::bigint,
        'Namnet stämmer inte. Kontrollera uppgifterna och försök igen.'::text;
      return;
    end if;

    update public.members
    set
      privacy_acknowledged_at = pg_catalog.now(),
      privacy_notice_version = v_privacy_notice_version
    where id = v_member.id;
  end if;

  insert into public.attendance (member_id, event_id)
  values (v_member.id, v_event.id)
  on conflict (member_id, event_id) do nothing;

  get diagnostics v_inserted = row_count;

  return query
  select
    case when v_inserted then 'ok' else 'already' end::text as status,
    v_member.namn::text as display_name,
    (select count(*)::bigint from public.attendance a where a.member_id = v_member.id) as visit_count,
    v_event.titel::text as event_title,
    (
      select count(*)::bigint
      from public.attendance a
      where (a.incheckad at time zone 'Europe/Stockholm')::date =
            (pg_catalog.now() at time zone 'Europe/Stockholm')::date
    ) as today_number,
    null::text as message;
end;
$$;

revoke all on function public.check_in_member(text, text) from public;
grant execute on function public.check_in_member(text, text) to anon, authenticated;
